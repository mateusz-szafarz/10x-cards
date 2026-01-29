import { memo } from 'react';
import { Bot, Pen, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import type { FlashcardDTO } from '../../types';

interface FlashcardCardProps {
  flashcard: FlashcardDTO;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Presentational component for displaying a single flashcard in the grid.
 * Shows truncated content, source badge, date, and action buttons.
 */
function FlashcardCardComponent({ flashcard, onEdit, onDelete }: FlashcardCardProps) {
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // Format: DD.MM.YYYY
  };

  const isAiGenerated = flashcard.source === 'ai_generated';

  return (
    <Card className="flex h-full flex-col" data-testid="flashcard-card">
      <CardHeader className="pb-3">
        <p className="text-sm font-medium">{truncate(flashcard.front, 150)}</p>
      </CardHeader>
      <CardContent className="flex-1 pb-3">
        <p className="text-muted-foreground border-t pt-3 text-sm">{truncate(flashcard.back, 150)}</p>
      </CardContent>
      <CardFooter className="text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {isAiGenerated ? (
              <>
                <Bot className="size-3" />
                <span>AI</span>
              </>
            ) : (
              <>
                <Pen className="size-3" />
                <span>Manual</span>
              </>
            )}
          </div>
          <span>•</span>
          <span>{formatDate(flashcard.created_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete flashcard">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

// Memoize to prevent unnecessary re-renders
export const FlashcardCard = memo(FlashcardCardComponent);
