import type { APIRoute } from 'astro';
import { createGenerationSchema } from '../../../lib/schemas/generation.schema';
import { createAIService } from '../../../lib/services/ai.service';
import { GenerationService } from '../../../lib/services/generation.service';

export const prerender = false;

/**
 * POST /api/generations
 *
 * Initiates AI-powered flashcard generation from source text.
 * Returns proposed flashcards for user review and editing.
 *
 * Request body:
 * - source_text: string (1000-10000 characters)
 *
 * Responses:
 * - 201: GenerationResponseDTO with proposals
 * - 400: Validation error (missing or invalid source_text)
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid JSON in request body',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Validate input using Zod schema
  const validationResult = createGenerationSchema.safeParse(body);

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    const isSourceTextMissing = firstError?.path.includes('source_text') && firstError?.code === 'invalid_type';
    const message = isSourceTextMissing ? 'Source text is required' : firstError?.message || 'Validation failed';

    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Get dependencies
  const supabase = locals.supabase;
  const generationService = new GenerationService(supabase);
  const aiService = createAIService();

  // Generate flashcards
  try {
    const result = await generationService.generateFlashcards(
      validationResult.data.source_text,
      locals.user.id,
      aiService,
    );

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Generation error:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate flashcards',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
