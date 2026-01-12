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
