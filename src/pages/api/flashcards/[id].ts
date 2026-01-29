import type { APIRoute } from 'astro';
import { updateFlashcardSchema } from '../../../lib/schemas/flashcard.schema';
import { FlashcardService } from '../../../lib/services/flashcard.service';
import { validateUUID } from '../../../lib/utils';
import type { FlashcardDTO, ErrorResponseDTO } from '../../../types';

export const prerender = false;

/**
 * GET /api/flashcards/:id
 *
 * Retrieves a single flashcard by ID.
 *
 * Path parameters:
 * - id: Flashcard UUID
 *
 * Returns:
 * - 200: FlashcardDTO with flashcard details
 * - 400: Invalid flashcard ID format
 * - 401: Unauthorized (middleware)
 * - 404: Flashcard not found
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const flashcardId = params.id;

  // Validate UUID format
  if (!flashcardId || !validateUUID(flashcardId)) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid flashcard ID format',
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Get flashcard from service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const flashcard = await flashcardService.getFlashcardById(flashcardId, locals.user!.id);

    if (!flashcard) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Flashcard not found',
          },
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(flashcard satisfies FlashcardDTO), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get flashcard error:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch flashcard',
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

/**
 * PUT /api/flashcards/:id
 *
 * Updates an existing flashcard.
 *
 * Path parameters:
 * - id: Flashcard UUID
 *
 * Request body:
 * - front: Updated flashcard question/prompt (1-500 characters)
 * - back: Updated flashcard answer (1-2000 characters)
 *
 * Returns:
 * - 200: FlashcardDTO with updated flashcard
 * - 400: Invalid flashcard ID format or validation error
 * - 401: Unauthorized (middleware)
 * - 404: Flashcard not found
 * - 500: Internal server error
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const flashcardId = params.id;

  // Validate UUID format
  if (!flashcardId || !validateUUID(flashcardId)) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid flashcard ID format',
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
  const validationResult = updateFlashcardSchema.safeParse(body);

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

  // Update flashcard via service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const flashcard = await flashcardService.updateFlashcard(flashcardId, validationResult.data, locals.user!.id);

    if (!flashcard) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Flashcard not found',
          },
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(flashcard satisfies FlashcardDTO), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update flashcard error:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update flashcard',
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

/**
 * DELETE /api/flashcards/:id
 *
 * Deletes a flashcard permanently.
 *
 * Path parameters:
 * - id: Flashcard UUID
 *
 * Returns:
 * - 204: No content (success)
 * - 400: Invalid flashcard ID format
 * - 401: Unauthorized (middleware)
 * - 404: Flashcard not found
 * - 500: Internal server error
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const flashcardId = params.id;

  // Validate UUID format
  if (!flashcardId || !validateUUID(flashcardId)) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid flashcard ID format',
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Delete flashcard via service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const deleted = await flashcardService.deleteFlashcard(flashcardId, locals.user!.id);

    if (!deleted) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Flashcard not found',
          },
        } satisfies ErrorResponseDTO),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete flashcard error:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete flashcard',
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
