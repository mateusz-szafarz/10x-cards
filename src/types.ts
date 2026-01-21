import type { Database } from "./db/database.types";

// =============================================================================
// Database Entity Types
// =============================================================================

/**
 * Base types derived from database schema.
 * These represent the raw database row structures.
 */
type FlashcardEntity = Database["public"]["Tables"]["flashcards"]["Row"];
type FlashcardInsert = Database["public"]["Tables"]["flashcards"]["Insert"];
type GenerationSessionInsert = Database["public"]["Tables"]["generation_sessions"]["Insert"];

/**
 * Flashcard source enum from database schema.
 */
export type FlashcardSource = Database["public"]["Enums"]["flashcard_source"];

// =============================================================================
// Pagination DTOs
// =============================================================================

/**
 * Standard pagination metadata returned with list endpoints.
 */
export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// =============================================================================
// Error DTOs
// =============================================================================

/**
 * Standard API error response structure.
 * All API errors follow this consistent format.
 */
export interface ErrorResponseDTO {
  error: {
    code: string;
    message: string;
  };
}

// =============================================================================
// Authentication DTOs & Command Models
// =============================================================================

/**
 * Command for user registration.
 * POST /api/auth/register
 */
export interface RegisterCommand {
  email: string;
  password: string;
}

/**
 * Command for user login.
 * POST /api/auth/login
 */
export interface LoginCommand {
  email: string;
  password: string;
}

/**
 * User information returned after authentication.
 * Subset of Supabase Auth user, containing only public fields.
 */
export interface AuthUserDTO {
  id: string;
  email: string;
}

/**
 * Response from POST /api/auth/register
 */
export interface RegisterResponseDTO {
  user: AuthUserDTO;
}

/**
 * Response from POST /api/auth/login
 */
export interface LoginResponseDTO {
  user: AuthUserDTO;
}

/**
 * Response from POST /api/auth/logout
 */
export interface LogoutResponseDTO {
  message: string;
}

/**
 * Response from DELETE /api/auth/account
 */
export interface DeleteAccountResponseDTO {
  message: string;
}

// =============================================================================
// Flashcard DTOs & Command Models
// =============================================================================

/**
 * Flashcard DTO returned from API.
 * Excludes user_id (implicit from authentication context).
 * Derived from FlashcardEntity using Omit.
 */
export type FlashcardDTO = Omit<FlashcardEntity, "user_id">;

/**
 * Command for creating a manual flashcard.
 * POST /api/flashcards
 *
 * Validation:
 * - front: required, 1-500 characters
 * - back: required, 1-2000 characters
 */
export type CreateFlashcardCommand = Pick<FlashcardInsert, "front" | "back">;

/**
 * Command for updating an existing flashcard.
 * PUT /api/flashcards/:id
 *
 * Same validation as CreateFlashcardCommand.
 */
export type UpdateFlashcardCommand = Pick<FlashcardInsert, "front" | "back">;

/**
 * Query parameters for GET /api/flashcards
 */
export interface FlashcardsQueryParams {
  page?: number;
  limit?: number;
  source?: FlashcardSource;
  sort?: "created_at" | "updated_at";
  order?: "asc" | "desc";
}

/**
 * Response from GET /api/flashcards
 */
export interface FlashcardsListDTO {
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;
}

// =============================================================================
// Generation DTOs & Command Models
// =============================================================================

/**
 * Command for initiating AI flashcard generation.
 * POST /api/generations
 *
 * Validation:
 * - source_text: required, 1000-10000 characters
 */
export type CreateGenerationCommand = Pick<GenerationSessionInsert, "source_text">;

/**
 * Proposed flashcard from AI generation.
 * These are not yet saved to the database.
 */
export interface FlashcardProposalDTO {
  front: string;
  back: string;
}

/**
 * Response from POST /api/generations (successful AI generation).
 */
export interface GenerationResponseDTO {
  generation_id: string;
  flashcards_proposals: FlashcardProposalDTO[];
  generated_count: number;
}

/**
 * Command for accepting generated flashcard proposals.
 * POST /api/generations/:id/accept
 *
 * Allows user to submit edited versions of proposed flashcards.
 * Validation per flashcard:
 * - front: required, 1-500 characters
 * - back: required, 1-2000 characters
 */
export interface AcceptGenerationCommand {
  flashcards: FlashcardProposalDTO[];
}

/**
 * Response from POST /api/generations/:id/accept
 */
export interface AcceptGenerationResponseDTO {
  flashcards: FlashcardDTO[];
  accepted_count: number;
}

/**
 * Query parameters for GET /api/generations
 */
export interface GenerationsQueryParams {
  page?: number;
  limit?: number;
}

/**
 * Generation session summary for list view.
 * GET /api/generations - returns array of these.
 * Contains truncated source_text (first 200 characters).
 */
export interface GenerationListItemDTO {
  id: string;
  source_text_preview: string;
  model_used: string;
  generated_count: number;
  accepted_count: number | null;
  created_at: string;
}

/**
 * Response from GET /api/generations
 */
export interface GenerationsListDTO {
  generations: GenerationListItemDTO[];
  pagination: PaginationDTO;
}

/**
 * Flashcard subset for generation detail view.
 * Excludes source and generation_id as they're implicit from context.
 */
export interface GenerationFlashcardDTO {
  id: string;
  front: string;
  back: string;
  created_at: string;
}

/**
 * Full generation session details.
 * GET /api/generations/:id
 * Includes full source_text and associated flashcards.
 */
export interface GenerationDetailDTO {
  id: string;
  source_text: string;
  model_used: string;
  generated_count: number;
  accepted_count: number | null;
  created_at: string;
  flashcards: GenerationFlashcardDTO[];
}
