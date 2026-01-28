import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type {
  GenerationResponseDTO,
  AcceptGenerationCommand,
  AcceptGenerationResponseDTO,
  ErrorResponseDTO,
  CreateGenerationCommand,
} from "../types";
import type { FlashcardProposalViewModel, GenerateViewState } from "../components/generation/types";
import { createGenerationSchema, acceptGenerationSchema } from "../lib/schemas/generation.schema";

interface UseGenerateFlashcardsReturn {
  // State
  sourceText: string;
  proposals: FlashcardProposalViewModel[];
  generationId: string | null;
  viewState: GenerateViewState;
  errorMessage: string | null;
  acceptedCount: number;

  // Actions
  setSourceText: (text: string) => void;
  generate: () => Promise<void>;
  acceptProposal: (index: number) => void;
  rejectProposal: (index: number) => void;
  editProposalFront: (index: number, value: string) => void;
  editProposalBack: (index: number, value: string) => void;
  saveAccepted: () => Promise<void>;
}

/**
 * Custom hook for managing flashcard generation state and operations.
 * Handles the full lifecycle: source text → generation → proposal review → save.
 */
export function useGenerateFlashcards(): UseGenerateFlashcardsReturn {
  // State
  const [sourceText, setSourceTextState] = useState("");
  const [proposals, setProposals] = useState<FlashcardProposalViewModel[]>([]);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [viewState, setViewState] = useState<GenerateViewState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derived state
  const acceptedCount = useMemo(() => proposals.filter((p) => p.status === "accepted").length, [proposals]);

  /**
   * Update source text.
   */
  const setSourceText = useCallback((text: string) => {
    setSourceTextState(text);
  }, []);

  /**
   * Map API error code to user-friendly message for generation errors.
   */
  const mapGenerationErrorToMessage = useCallback((code: string, status: number): string => {
    if (status === 401) return ""; // handled separately via redirect

    const messages: Record<string, string> = {
      VALIDATION_ERROR: "Invalid input. Please check your text and try again.",
      INTERNAL_ERROR: "An unexpected error occurred. Please try again.",
    };

    return messages[code] || "An unexpected error occurred. Please try again.";
  }, []);

  /**
   * Map API error code to user-friendly message for accept/save errors.
   */
  const mapAcceptErrorToMessage = useCallback((code: string): string => {
    const messages: Record<string, string> = {
      VALIDATION_ERROR: "Some flashcards have invalid content. Please review and try again.",
      NOT_FOUND: "Generation session not found. Please generate new flashcards.",
      ALREADY_FINALIZED: "These flashcards have already been saved.",
      INTERNAL_ERROR: "Failed to save flashcards. Please try again.",
    };

    return messages[code] || "An unexpected error occurred. Please try again.";
  }, []);

  /**
   * Generate flashcard proposals from source text.
   */
  const generate = useCallback(async () => {
    // Validate source text
    const validation = createGenerationSchema.safeParse({ source_text: sourceText });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      setErrorMessage(firstError.message);
      setViewState("error");
      return;
    }

    // Cancel previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Clear previous state
    setViewState("generating");
    setErrorMessage(null);
    setProposals([]);
    setGenerationId(null);

    try {
      const body: CreateGenerationCommand = {
        source_text: sourceText,
      };

      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]),
      });

      // Handle 401 - session expired
      if (response.status === 401) {
        toast.error("Session expired. Please log in again.");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const errorData: ErrorResponseDTO = await response.json();
        const message = mapGenerationErrorToMessage(errorData.error.code, response.status);
        setErrorMessage(message);
        setViewState("error");
        return;
      }

      const data: GenerationResponseDTO = await response.json();

      // Map proposals to view models with 'pending' status
      const viewModels: FlashcardProposalViewModel[] = data.flashcards_proposals.map((proposal) => ({
        front: proposal.front,
        back: proposal.back,
        status: "pending",
      }));

      setProposals(viewModels);
      setGenerationId(data.generation_id);
      setViewState("generated");
    } catch (err) {
      // Component unmount — silently ignore
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      // Timeout error
      if (err instanceof DOMException && err.name === "TimeoutError") {
        setErrorMessage("Request timed out. Please try again.");
        setViewState("error");
        return;
      }

      // Network error
      if (err instanceof TypeError) {
        setErrorMessage("Unable to connect to server. Please check your connection.");
        setViewState("error");
        return;
      }

      console.error("Failed to generate flashcards:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setViewState("error");
    }
  }, [sourceText, mapGenerationErrorToMessage]);

  /**
   * Accept a proposal.
   */
  const acceptProposal = useCallback((index: number) => {
    setProposals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: "accepted" };
      return updated;
    });
  }, []);

  /**
   * Reject a proposal.
   */
  const rejectProposal = useCallback((index: number) => {
    setProposals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: "rejected" };
      return updated;
    });
  }, []);

  /**
   * Edit front text of a proposal.
   */
  const editProposalFront = useCallback((index: number, value: string) => {
    setProposals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], front: value };
      return updated;
    });
  }, []);

  /**
   * Edit back text of a proposal.
   */
  const editProposalBack = useCallback((index: number, value: string) => {
    setProposals((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], back: value };
      return updated;
    });
  }, []);

  /**
   * Save accepted proposals to the database.
   */
  const saveAccepted = useCallback(async () => {
    if (!generationId) {
      toast.error("Generation session not found. Please generate new flashcards.");
      return;
    }

    // Filter accepted proposals
    const acceptedProposals = proposals
      .filter((p) => p.status === "accepted")
      .map((p) => ({ front: p.front, back: p.back }));

    // Validate accepted proposals
    const validation = acceptGenerationSchema.safeParse({ flashcards: acceptedProposals });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setViewState("saving");

    try {
      const body: AcceptGenerationCommand = {
        flashcards: acceptedProposals,
      };

      const response = await fetch(`/api/generations/${generationId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
        signal: AbortSignal.timeout(10_000),
      });

      // Handle 401 - session expired
      if (response.status === 401) {
        toast.error("Session expired. Please log in again.");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const errorData: ErrorResponseDTO = await response.json();
        const message = mapAcceptErrorToMessage(errorData.error.code);
        toast.error(message);
        setViewState("generated"); // Revert to generated state
        return;
      }

      const data: AcceptGenerationResponseDTO = await response.json();

      // Success - show toast and redirect
      toast.success(`Saved ${data.accepted_count} flashcard${data.accepted_count === 1 ? "" : "s"}`);
      window.location.href = "/flashcards";
    } catch (err) {
      // Timeout error
      if (err instanceof DOMException && err.name === "TimeoutError") {
        toast.error("Request timed out. Please try again.");
        setViewState("generated");
        return;
      }

      // Network error
      if (err instanceof TypeError) {
        toast.error("Unable to connect to server. Please check your connection.");
        setViewState("generated");
        return;
      }

      console.error("Failed to save flashcards:", err);
      toast.error("Failed to save flashcards. Please try again.");
      setViewState("generated");
    }
  }, [generationId, proposals, mapAcceptErrorToMessage]);

  // Cleanup: abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    sourceText,
    proposals,
    generationId,
    viewState,
    errorMessage,
    acceptedCount,
    setSourceText,
    generate,
    acceptProposal,
    rejectProposal,
    editProposalFront,
    editProposalBack,
    saveAccepted,
  };
}
