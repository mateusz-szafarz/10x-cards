import { useState, useCallback, useRef, useEffect } from "react";
import type {
  FlashcardDTO,
  PaginationDTO,
  FlashcardsListDTO,
  CreateFlashcardCommand,
  UpdateFlashcardCommand,
  ErrorResponseDTO,
} from "../types";
import type { FlashcardFormData } from "../components/flashcards/types";
import { toast } from "sonner";

interface UseFlashcardsParams {
  initialFlashcards: FlashcardDTO[];
  initialPagination: PaginationDTO;
  initialError?: string;
}

interface UseFlashcardsReturn {
  // Data
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;

  // UI state
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  currentPage: number;

  // Actions
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  createFlashcard: (data: FlashcardFormData) => Promise<void>;
  updateFlashcard: (id: string, data: FlashcardFormData) => Promise<void>;
  deleteFlashcard: (id: string) => Promise<void>;
  retry: () => void;
}

/**
 * Custom hook for managing flashcard list state and operations.
 * Encapsulates all data fetching and mutation logic for the flashcards view.
 */
export function useFlashcards({
  initialFlashcards,
  initialPagination,
  initialError,
}: UseFlashcardsParams): UseFlashcardsReturn {
  // Data state
  const [flashcards, setFlashcards] = useState<FlashcardDTO[]>(initialFlashcards);
  const [pagination, setPagination] = useState<PaginationDTO>(initialPagination);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [searchQuery, setSearchQueryState] = useState("");
  const [currentPage, setCurrentPageState] = useState(1);

  // Refs for debounce and abort controller
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Backup for optimistic delete rollback
  const flashcardsBackupRef = useRef<FlashcardDTO[]>([]);

  /**
   * Internal fetch function that calls the API with current query params.
   */
  const fetchFlashcards = useCallback(async (page: number, search: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sort: "created_at",
        order: "desc",
      });

      if (search) {
        params.append("search", search);
      }

      const response = await fetch(`/api/flashcards?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
      });

      // Handle 401 - session expired
      if (response.status === 401) {
        toast.error("Session expired. Please log in again.");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const errorData: ErrorResponseDTO = await response.json();
        throw new Error(errorData.error.message);
      }

      const data: FlashcardsListDTO = await response.json();
      setFlashcards(data.flashcards);
      setPagination(data.pagination);

      // If we're on a page that doesn't exist anymore, go to last page
      if (data.flashcards.length === 0 && page > 1 && data.pagination.total_pages < page) {
        setCurrentPageState(Math.max(1, data.pagination.total_pages));
        // This will trigger a re-fetch via useEffect
      }
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      console.error("Failed to fetch flashcards:", err);
      const message = err instanceof Error ? err.message : "Failed to load flashcards. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set search query and trigger debounced fetch.
   * Resets to page 1.
   */
  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query);

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Schedule new fetch after 300ms
      debounceTimerRef.current = setTimeout(() => {
        setCurrentPageState(1);
        fetchFlashcards(1, query);
      }, 300);
    },
    [fetchFlashcards]
  );

  /**
   * Set current page and trigger immediate fetch.
   */
  const setCurrentPage = useCallback(
    (page: number) => {
      setCurrentPageState(page);
      fetchFlashcards(page, searchQuery);
    },
    [fetchFlashcards, searchQuery]
  );

  /**
   * Create a new manual flashcard.
   * Strategy: Refetch + reset (clears search, goes to page 1).
   */
  const createFlashcard = useCallback(
    async (data: FlashcardFormData) => {
      try {
        const body: CreateFlashcardCommand = {
          front: data.front,
          back: data.back,
        };

        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
          signal: AbortSignal.timeout(10_000),
        });

        if (response.status === 401) {
          toast.error("Session expired. Please log in again.");
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          const errorData: ErrorResponseDTO = await response.json();
          throw new Error(errorData.error.message);
        }

        // Success - reset to page 1, clear search, refetch
        toast.success("Flashcard created");
        setSearchQueryState("");
        setCurrentPageState(1);
        await fetchFlashcards(1, "");
      } catch (err) {
        console.error("Failed to create flashcard:", err);
        const message = err instanceof Error ? err.message : "Failed to create flashcard. Please try again.";
        toast.error(message);
        throw err; // Re-throw so dialog can handle it
      }
    },
    [fetchFlashcards]
  );

  /**
   * Update an existing flashcard.
   * Strategy: Refetch with context (preserves page and search).
   */
  const updateFlashcard = useCallback(
    async (id: string, data: FlashcardFormData) => {
      try {
        const body: UpdateFlashcardCommand = {
          front: data.front,
          back: data.back,
        };

        const response = await fetch(`/api/flashcards/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
          signal: AbortSignal.timeout(10_000),
        });

        if (response.status === 401) {
          toast.error("Session expired. Please log in again.");
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          const errorData: ErrorResponseDTO = await response.json();
          throw new Error(errorData.error.message);
        }

        // Success - refetch current view
        toast.success("Flashcard updated");
        await fetchFlashcards(currentPage, searchQuery);
      } catch (err) {
        console.error("Failed to update flashcard:", err);
        const message = err instanceof Error ? err.message : "Failed to update flashcard. Please try again.";
        toast.error(message);
        throw err;
      }
    },
    [fetchFlashcards, currentPage, searchQuery]
  );

  /**
   * Delete a flashcard with optimistic UI update.
   * Strategy: Optimistic removal + refetch (preserves page and search).
   */
  const deleteFlashcard = useCallback(
    async (id: string) => {
      // Store backup for rollback
      flashcardsBackupRef.current = flashcards;

      // Optimistic removal
      setFlashcards((prev) => prev.filter((card) => card.id !== id));

      try {
        const response = await fetch(`/api/flashcards/${id}`, {
          method: "DELETE",
          credentials: "include",
          signal: AbortSignal.timeout(10_000),
        });

        if (response.status === 401) {
          toast.error("Session expired. Please log in again.");
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          const errorData: ErrorResponseDTO = await response.json();
          throw new Error(errorData.error.message);
        }

        // Success - refetch to fix pagination
        toast.success("Flashcard deleted");
        await fetchFlashcards(currentPage, searchQuery);
      } catch (err) {
        // Rollback optimistic update
        setFlashcards(flashcardsBackupRef.current);
        console.error("Failed to delete flashcard:", err);
        toast.error("Failed to delete flashcard");
      }
    },
    [flashcards, fetchFlashcards, currentPage, searchQuery]
  );

  /**
   * Retry last fetch operation.
   */
  const retry = useCallback(() => {
    fetchFlashcards(currentPage, searchQuery);
  }, [fetchFlashcards, currentPage, searchQuery]);

  // Cleanup debounce timer and abort controller on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    flashcards,
    pagination,
    isLoading,
    error,
    searchQuery,
    currentPage,
    setSearchQuery,
    setCurrentPage,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    retry,
  };
}
