import type { APIRoute } from 'astro';
import { acceptGenerationSchema } from '../../../../lib/schemas/generation.schema';
import { GenerationService } from '../../../../lib/services/generation.service';
import { validateUUID } from '../../../../lib/utils';
import type { AcceptGenerationResponseDTO, ErrorResponseDTO } from '../../../../types';

export const prerender = false;

/**
 * POST /api/generations/:id/accept
 *
 * Accepts selected flashcard proposals from an AI generation session.
 * Creates flashcards in the database and updates the generation session
 * as finalized.
 *
 * Path parameters:
 * - id: Generation session UUID
 *
 * Request body:
 * - flashcards: Array of flashcard proposals to accept
 *   - Each flashcard must have:
 *     - front: Question/prompt (1-500 characters)
 *     - back: Answer (1-2000 characters)
 *
 * Returns:
 * - 201: AcceptGenerationResponseDTO with created flashcards
 * - 400: Invalid generation ID format or validation error
 * - 401: Unauthorized (middleware)
 * - 404: Generation session not found
 * - 409: Generation session already finalized
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  // Extract generation ID from path
  const generationId = params.id;

  // Validate UUID format
  if (!generationId || !validateUUID(generationId)) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid generation ID format',
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
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
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Validate input using Zod schema
  const validationResult = acceptGenerationSchema.safeParse(body);

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError?.message || 'Validation failed',
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Get dependencies
  const supabase = locals.supabase;
  const generationService = new GenerationService(supabase);

  // Accept flashcards
  try {
    const result = await generationService.acceptFlashcards(
      generationId,
      validationResult.data.flashcards,
      locals.user!.id,
    );

    return new Response(JSON.stringify(result satisfies AcceptGenerationResponseDTO), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error instanceof Error && 'code' in error) {
      const errorCode = (error as Error & { code: string }).code;

      if (errorCode === 'NOT_FOUND') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'NOT_FOUND',
              message: 'Generation session not found',
            },
          } satisfies ErrorResponseDTO),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (errorCode === 'ALREADY_FINALIZED') {
        return new Response(
          JSON.stringify({
            error: {
              code: 'ALREADY_FINALIZED',
              message: 'Generation session has already been finalized',
            },
          } satisfies ErrorResponseDTO),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    // Generic error
    console.error('Accept generation error:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save flashcards',
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
