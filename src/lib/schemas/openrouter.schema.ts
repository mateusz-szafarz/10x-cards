import { z } from "zod";

/**
 * Schema for a single flashcard proposal from AI generation.
 * Validates that both front and back are non-empty strings.
 */
export const flashcardProposalSchema = z.object({
  front: z.string().min(1, "Front cannot be empty"),
  back: z.string().min(1, "Back cannot be empty"),
});

/**
 * Schema for OpenRouter API response structure.
 * Validates the top-level response format before extracting content.
 */
export const openRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      })
    )
    .min(1, "Response must contain at least one choice"),
});

/**
 * Schema for the parsed flashcards response from AI.
 * The AI returns a JSON object with a flashcards array.
 * We expect 1-8 flashcards per generation.
 */
export const flashcardsResponseSchema = z.object({
  flashcards: z.array(flashcardProposalSchema).min(1).max(8),
});
