import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type {
  FlashcardDTO,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  FlashcardsListDTO,
  FlashcardsQueryParams,
} from "../../types";
import { buildPaginationMetadata } from "../utils";

/**
 * Service responsible for flashcard CRUD operations.
 *
 * Handles manual flashcard creation, updates, deletions, and listing
 * with pagination and filtering capabilities.
 */
export class FlashcardService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Creates a manual flashcard.
   *
   * @param command - Flashcard creation data (front, back)
   * @param userId - ID of the user creating the flashcard
   * @returns Created flashcard with generated ID and timestamps
   * @throws Error if database operation fails
   */
  async createFlashcard(command: CreateFlashcardCommand, userId: string): Promise<FlashcardDTO> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .insert({
        front: command.front,
        back: command.back,
        user_id: userId,
        source: "manual",
        generation_id: null,
      })
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .single();

    if (error) {
      throw new Error(`Failed to create flashcard: ${error.message}`);
    }

    return data;
  }

  /**
   * Updates an existing flashcard.
   *
   * @param id - ID of the flashcard to update
   * @param command - Updated flashcard data (front, back)
   * @param userId - ID of the user (ensures ownership)
   * @returns Updated flashcard or null if not found/no access
   * @throws Error if database operation fails
   */
  async updateFlashcard(id: string, command: UpdateFlashcardCommand, userId: string): Promise<FlashcardDTO | null> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .update({
        front: command.front,
        back: command.back,
      })
      .eq("id", id)
      .eq("user_id", userId) // Explicit filter + RLS
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned (not found or no access)
        return null;
      }
      throw new Error(`Failed to update flashcard: ${error.message}`);
    }

    return data;
  }

  /**
   * Deletes a flashcard permanently.
   *
   * @param id - ID of the flashcard to delete
   * @param userId - ID of the user (ensures ownership)
   * @returns true if deleted, false if not found/no access
   * @throws Error if database operation fails
   */
  async deleteFlashcard(id: string, userId: string): Promise<boolean> {
    const { error, count } = await this.supabase
      .from("flashcards")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", userId); // Explicit filter + RLS

    if (error) {
      throw new Error(`Failed to delete flashcard: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  /**
   * Gets a single flashcard by ID.
   *
   * @param id - ID of the flashcard to retrieve
   * @param userId - ID of the user (ensures ownership)
   * @returns Flashcard or null if not found/no access
   * @throws Error if database operation fails
   */
  async getFlashcardById(id: string, userId: string): Promise<FlashcardDTO | null> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .select("id, front, back, source, generation_id, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", userId) // Explicit filter + RLS
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to get flashcard: ${error.message}`);
    }

    return data;
  }

  /**
   * Lists flashcards with pagination and filtering.
   *
   * @param params - Query parameters (page, limit, source, sort, order)
   * @param userId - ID of the user (ensures ownership)
   * @returns List of flashcards with pagination metadata
   * @throws Error if database operation fails
   */
  async listFlashcards(params: FlashcardsQueryParams, userId: string): Promise<FlashcardsListDTO> {
    const { page = 1, limit = 20, source, sort = "created_at", order = "desc" } = params;

    // Calculate offset for pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query with dynamic filtering and sorting
    let query = this.supabase
      .from("flashcards")
      .select("id, front, back, source, generation_id, created_at, updated_at", {
        count: "exact",
      })
      .eq("user_id", userId); // Explicit filter + RLS

    // Optional source filter
    if (source) {
      query = query.eq("source", source);
    }

    // Sorting
    query = query.order(sort, { ascending: order === "asc" });

    // Pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list flashcards: ${error.message}`);
    }

    return {
      flashcards: data ?? [],
      pagination: buildPaginationMetadata(page, limit, count ?? 0),
    };
  }
}
