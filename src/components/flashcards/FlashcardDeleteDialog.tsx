import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import type { FlashcardDTO } from '../../types';

interface FlashcardDeleteDialogProps {
  flashcard: FlashcardDTO | null;
  isOpen: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for permanently deleting a flashcard.
 * Uses AlertDialog to enforce explicit user confirmation.
 */
export function FlashcardDeleteDialog({
  flashcard,
  isOpen,
  isDeleting,
  onCancel,
  onConfirm,
}: FlashcardDeleteDialogProps) {
  if (!flashcard) return null;

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Flashcard?</AlertDialogTitle>
          <AlertDialogDescription>
            This operation is irreversible. The flashcard will be permanently deleted.
            <div className="bg-muted mt-2 rounded p-2 text-sm">
              <strong>Front:</strong> {truncate(flashcard.front, 100)}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
