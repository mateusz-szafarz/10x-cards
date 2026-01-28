import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert } from "../ui/alert";
import { Skeleton } from "../ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { FlashcardCard } from "./FlashcardCard";
import { FlashcardEmpty } from "./FlashcardEmpty";
import { FlashcardEditDialog } from "./FlashcardEditDialog";
import { FlashcardDeleteDialog } from "./FlashcardDeleteDialog";
import { useFlashcards } from "../../hooks/useFlashcards";
import type { FlashcardDTO, PaginationDTO } from "../../types";
import type { FlashcardFormData } from "./types";

interface FlashcardListProps {
  initialFlashcards: FlashcardDTO[];
  initialPagination: PaginationDTO;
  initialError?: string;
}

/**
 * Main container component for the "My Flashcards" view.
 * Orchestrates flashcard list state, search, pagination, and CRUD operations.
 */
export default function FlashcardList({ initialFlashcards, initialPagination, initialError }: FlashcardListProps) {
  const {
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
  } = useFlashcards({ initialFlashcards, initialPagination, initialError });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<FlashcardDTO | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFlashcard, setDeletingFlashcard] = useState<FlashcardDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasFlashcards = flashcards.length > 0;
  const hasInitialData = initialFlashcards.length > 0 || initialPagination.total > 0;

  // Dialog handlers
  const handleCreateNew = useCallback(() => {
    setEditingFlashcard(null);
    setEditDialogOpen(true);
  }, []);

  const handleEdit = useCallback((flashcard: FlashcardDTO) => {
    setEditingFlashcard(flashcard);
    setEditDialogOpen(true);
  }, []);

  const handleEditDialogClose = useCallback(() => {
    setEditDialogOpen(false);
    setEditingFlashcard(null);
  }, []);

  const handleSave = useCallback(
    async (data: FlashcardFormData) => {
      if (editingFlashcard) {
        await updateFlashcard(editingFlashcard.id, data);
      } else {
        await createFlashcard(data);
      }
    },
    [editingFlashcard, updateFlashcard, createFlashcard]
  );

  const handleDeleteClick = useCallback((flashcard: FlashcardDTO) => {
    setDeletingFlashcard(flashcard);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeletingFlashcard(null);
    setIsDeleting(false);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingFlashcard) return;

    setIsDeleting(true);
    setDeleteDialogOpen(false);

    try {
      await deleteFlashcard(deletingFlashcard.id);
    } finally {
      setDeletingFlashcard(null);
      setIsDeleting(false);
    }
  }, [deletingFlashcard, deleteFlashcard]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Flashcards</h1>
        <Button onClick={handleCreateNew} data-testid="new-flashcard-button">+ New Flashcard</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search flashcards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxLength={200}
          className="pl-10"
          aria-label="Search flashcards"
        />
      </div>

      {/* Content area */}
      <div aria-live="polite" aria-busy={isLoading}>
        {/* Error state */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={retry}>
                Try again
              </Button>
            </div>
          </Alert>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty state (no flashcards at all) */}
        {!isLoading && !error && !hasFlashcards && !hasInitialData && <FlashcardEmpty onCreateNew={handleCreateNew} />}

        {/* Empty state (search with no results) */}
        {!isLoading && !error && !hasFlashcards && hasInitialData && searchQuery && (
          <div className="text-center py-12 text-muted-foreground">No results found for "{searchQuery}"</div>
        )}

        {/* Data state (flashcard grid) */}
        {!isLoading && !error && hasFlashcards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flashcards.map((flashcard) => (
              <FlashcardCard
                key={flashcard.id}
                flashcard={flashcard}
                onEdit={() => handleEdit(flashcard)}
                onDelete={() => handleDeleteClick(flashcard)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !error && hasFlashcards && pagination.total_pages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={page === currentPage}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() => currentPage < pagination.total_pages && setCurrentPage(currentPage + 1)}
                  className={
                    currentPage === pagination.total_pages ? "pointer-events-none opacity-50" : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Dialogs */}
      <FlashcardEditDialog
        flashcard={editingFlashcard}
        isOpen={editDialogOpen}
        onClose={handleEditDialogClose}
        onSave={handleSave}
      />

      <FlashcardDeleteDialog
        flashcard={deletingFlashcard}
        isOpen={deleteDialogOpen}
        isDeleting={isDeleting}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
