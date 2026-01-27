import { BookOpen } from "lucide-react";
import { Button } from "../ui/button";

interface FlashcardEmptyProps {
  onCreateNew: () => void;
}

/**
 * Empty state component displayed when user has no flashcards.
 * Shows friendly message with CTAs to generate or create manually.
 */
export function FlashcardEmpty({ onCreateNew }: FlashcardEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <BookOpen className="size-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2">No flashcards yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Generate your first flashcards from text or add them manually.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => (window.location.href = "/generate")}>Generate Flashcards</Button>
        <Button variant="outline" onClick={onCreateNew}>
          + New Flashcard
        </Button>
      </div>
    </div>
  );
}
