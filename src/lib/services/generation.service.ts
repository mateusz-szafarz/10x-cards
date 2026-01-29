import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types.ts';
import type { FlashcardProposalDTO, GenerationResponseDTO, AcceptGenerationResponseDTO } from '../../types';
import type { AIService } from './ai.service';

/**
 * Service responsible for managing flashcard generation sessions.
 * Orchestrates AI service calls and database persistence.
 */
export class GenerationService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

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
   * @param aiService - The AI service instance to use for generation
   * @returns GenerationResponseDTO with proposals and metadata
   * @throws Error if database operation fails
   */
  async generateFlashcards(sourceText: string, userId: string, aiService: AIService): Promise<GenerationResponseDTO> {
    // Generate flashcard proposals via AI service
    const proposals: FlashcardProposalDTO[] = await aiService.generateFlashcardProposals(sourceText);

    // Save generation session to database
    const { data, error } = await this.supabase
      .from('generation_sessions')
      .insert({
        source_text: sourceText,
        user_id: userId,
        generated_count: proposals.length,
        model_used: aiService.modelName,
      })
      .select('id')
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

  /**
   * Accepts selected flashcard proposals and saves them to the database.
   * Uses RPC function to ensure transactional consistency.
   *
   * @param generationId - The generation session ID
   * @param flashcards - Array of flashcard proposals to accept
   * @param userId - The user ID
   * @returns AcceptGenerationResponseDTO with created flashcards
   * @throws Error with specific codes: NOT_FOUND, ALREADY_FINALIZED, INTERNAL_ERROR
   */
  async acceptFlashcards(
    generationId: string,
    flashcards: FlashcardProposalDTO[],
    userId: string,
  ): Promise<AcceptGenerationResponseDTO> {
    // Call RPC function for transactional accept
    const { data, error } = await this.supabase.rpc('accept_generation', {
      p_generation_id: generationId,
      p_user_id: userId,
      p_flashcards: flashcards,
    });

    if (error) {
      throw new Error(error.message);
    }

    // Handle error response from RPC
    if (data && 'error' in data) {
      const err = data.error as { code: string; message: string };
      const error = new Error(err.message) as Error & { code: string };
      error.code = err.code;
      throw error;
    }

    return {
      flashcards: data.flashcards,
      accepted_count: data.accepted_count,
    };
  }
}
