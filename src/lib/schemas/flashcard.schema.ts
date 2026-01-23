import { z } from "zod";

/**
 * Schema for creating a manual flashcard.
 * POST /api/flashcards
 */
export const createFlashcardSchema = z.object({
  front: z
    .string({ required_error: "Front is required" })
    .min(1, "Front must be between 1 and 500 characters")
    .max(500, "Front must be between 1 and 500 characters"),
  back: z
    .string({ required_error: "Back is required" })
    .min(1, "Back must be between 1 and 2000 characters")
    .max(2000, "Back must be between 1 and 2000 characters"),
});

/**
 * Schema for updating a flashcard.
 * PUT /api/flashcards/:id
 *
 * Same validation as createFlashcardSchema.
 */
export const updateFlashcardSchema = createFlashcardSchema;

/**
 * Schema for flashcards query parameters.
 * GET /api/flashcards
 */
export const flashcardsQueryParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  source: z.enum(["ai_generated", "manual"]).optional(),
  sort: z.enum(["created_at", "updated_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;
export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;
export type FlashcardsQueryParamsInput = z.infer<typeof flashcardsQueryParamsSchema>;
