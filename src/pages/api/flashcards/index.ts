import type { APIRoute } from "astro";
import { createFlashcardSchema, flashcardsQueryParamsSchema } from "../../../lib/schemas/flashcard.schema";
import { FlashcardService } from "../../../lib/services/flashcard.service";
import type { FlashcardDTO, FlashcardsListDTO, ErrorResponseDTO } from "../../../types";

export const prerender = false;

/**
 * GET /api/flashcards
 *
 * Lists user's flashcards with pagination and optional filtering.
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - source: Filter by source ("ai_generated" or "manual")
 * - sort: Sort field ("created_at" or "updated_at", default: "created_at")
 * - order: Sort order ("asc" or "desc", default: "desc")
 *
 * Returns:
 * - 200: FlashcardsListDTO with flashcards array and pagination metadata
 * - 400: Invalid query parameters
 * - 401: Unauthorized (middleware)
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ url, locals }) => {
  // Parse and validate query parameters
  // Convert null to undefined so Zod can apply defaults
  const params = {
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
  };

  const validationResult = flashcardsQueryParamsSchema.safeParse(params);

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: firstError?.message || "Invalid pagination parameters",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get flashcards from service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const result = await flashcardService.listFlashcards(validationResult.data, locals.user!.id);

    return new Response(JSON.stringify(result satisfies FlashcardsListDTO), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List flashcards error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch flashcards",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * POST /api/flashcards
 *
 * Creates a new manual flashcard.
 *
 * Request body:
 * - front: Flashcard question/prompt (1-500 characters)
 * - back: Flashcard answer (1-2000 characters)
 *
 * Returns:
 * - 201: FlashcardDTO with created flashcard
 * - 400: Invalid request body or validation error
 * - 401: Unauthorized (middleware)
 * - 500: Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in request body",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate input using Zod schema
  const validationResult = createFlashcardSchema.safeParse(body);

  if (!validationResult.success) {
    const firstError = validationResult.error.errors[0];
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: firstError?.message || "Validation failed",
        },
      } satisfies ErrorResponseDTO),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create flashcard via service
  const flashcardService = new FlashcardService(locals.supabase);

  try {
    const result = await flashcardService.createFlashcard(validationResult.data, locals.user!.id);

    return new Response(JSON.stringify(result satisfies FlashcardDTO), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create flashcard error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create flashcard",
        },
      } satisfies ErrorResponseDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
