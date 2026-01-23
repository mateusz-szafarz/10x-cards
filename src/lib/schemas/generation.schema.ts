import { z } from "zod";

/**
 * Zod schema for validating CreateGenerationCommand.
 * Used to validate incoming requests to POST /api/generations.
 *
 * Validation rules:
 * - source_text: required string, 1000-10000 characters
 */
export const createGenerationSchema = z.object({
  source_text: z
    .string({
      required_error: "Source text is required",
    })
    .min(1000, "Source text must be between 1000 and 10000 characters")
    .max(10000, "Source text must be between 1000 and 10000 characters"),
});

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;

/**
 * Schema for accepting generated flashcard proposals.
 * POST /api/generations/:id/accept
 */
export const acceptGenerationSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z
          .string({ required_error: "Front is required" })
          .min(1, "Front must be between 1 and 500 characters")
          .max(500, "Front must be between 1 and 500 characters"),
        back: z
          .string({ required_error: "Back is required" })
          .min(1, "Back must be between 1 and 2000 characters")
          .max(2000, "Back must be between 1 and 2000 characters"),
      })
    )
    .nonempty("Flashcards array cannot be empty"),
});

export type AcceptGenerationInput = z.infer<typeof acceptGenerationSchema>;
