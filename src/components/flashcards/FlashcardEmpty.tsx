import { BookOpen } from 'lucide-react';
import { Button } from '../ui/button';

interface FlashcardEmptyProps {
  onCreateNew: () => void;
}

/**
 * Empty state component displayed when user has no flashcards.
 * Shows friendly message with CTAs to generate or create manually.
 */
export function FlashcardEmpty({ onCreateNew }: FlashcardEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <BookOpen className="text-muted-foreground mb-4 size-16" />
      <h2 className="mb-2 text-2xl font-semibold">No flashcards yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Generate your first flashcards from text or add them manually.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => (window.location.href = '/generate')}>Generate Flashcards</Button>
        <Button variant="outline" onClick={onCreateNew}>
          + New Flashcard
        </Button>
      </div>
    </div>
  );
}
