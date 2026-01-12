import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types.ts";
import type { FlashcardProposalDTO, GenerationResponseDTO } from "../../types";
import type { AIService } from "./ai.service";

/**
 * Service responsible for managing flashcard generation sessions.
 * Orchestrates AI service calls and database persistence.
 */
export class GenerationService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly aiService: AIService
  ) {}

  /**
   * Generates flashcard proposals from source text.
   *
   * Flow:
   * 1. Call AI service to generate proposals
   * 2. Save generation session to database
   * 3. Return DTO with generation_id and proposals
   *
   * @param sourceText - The source text to generate flashcards from
   * @param userId - The user ID to associate with the generation session
   * @returns GenerationResponseDTO with proposals and metadata
   * @throws Error if database operation fails
   */
  async generateFlashcards(sourceText: string, userId: string): Promise<GenerationResponseDTO> {
    // Generate flashcard proposals via AI service
    const proposals: FlashcardProposalDTO[] = await this.aiService.generateFlashcardProposals(sourceText);

    // Save generation session to database
    const { data, error } = await this.supabase
      .from("generation_sessions")
      .insert({
        source_text: sourceText,
        user_id: userId,
        generated_count: proposals.length,
        model_used: "mock-gpt-4", // MVP: hardcoded mock model name
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to save generation session: ${error.message}`);
    }

    return {
      generation_id: data.id,
      flashcards_proposals: proposals,
      generated_count: proposals.length,
    };
  }
}
