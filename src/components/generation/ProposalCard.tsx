import { memo, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import type { FlashcardProposalViewModel } from './types';
import { cn } from '../../lib/utils';

interface ProposalCardProps {
  proposal: FlashcardProposalViewModel;
  isDisabled: boolean; // true when viewState === 'saving'
  onAccept: () => void;
  onReject: () => void;
  onEditFront: (value: string) => void;
  onEditBack: (value: string) => void;
}

/**
 * Controlled presentational component displaying a single flashcard proposal.
 * Shows front/back content with inline editing capability.
 * The proposal's data state is fully managed by the parent.
 */
function ProposalCardComponent({
  proposal,
  isDisabled,
  onAccept,
  onReject,
  onEditFront,
  onEditBack,
}: ProposalCardProps) {
  // Local UI state for edit mode
  const [isEditingFront, setIsEditingFront] = useState(false);
  const [isEditingBack, setIsEditingBack] = useState(false);

  const frontLength = proposal.front.length;
  const backLength = proposal.back.length;
  const isFrontInvalid = frontLength === 0 || frontLength > 500;
  const isBackInvalid = backLength === 0 || backLength > 2000;

  return (
    <Card
      className={cn(
        'flex h-full flex-col transition-all',
        proposal.status === 'accepted' && 'border-green-500 bg-green-50/50 dark:bg-green-950/20',
        proposal.status === 'rejected' && 'opacity-50',
      )}
    >
      <CardHeader className="pb-3">
        {isEditingFront ? (
          <div className="space-y-2">
            <Textarea
              value={proposal.front}
              onChange={(e) => onEditFront(e.target.value)}
              onBlur={() => setIsEditingFront(false)}
              maxLength={500}
              rows={3}
              className={cn(isFrontInvalid && 'border-destructive')}
            />
            <div className={cn('text-right text-xs', isFrontInvalid ? 'text-destructive' : 'text-muted-foreground')}>
              {frontLength}/500 characters
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className={cn('text-sm font-medium', isFrontInvalid && 'text-destructive')}>
              {proposal.front || '(Empty front — edit to add content)'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingFront(true)}
              disabled={isDisabled}
              className="h-6 px-2 text-xs"
            >
              Edit front
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {isEditingBack ? (
          <div className="space-y-2">
            <Textarea
              value={proposal.back}
              onChange={(e) => onEditBack(e.target.value)}
              onBlur={() => setIsEditingBack(false)}
              maxLength={2000}
              rows={5}
              className={cn(isBackInvalid && 'border-destructive')}
            />
            <div className={cn('text-right text-xs', isBackInvalid ? 'text-destructive' : 'text-muted-foreground')}>
              {backLength}/2000 characters
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className={cn('text-muted-foreground border-t pt-3 text-sm', isBackInvalid && 'text-destructive')}>
              {proposal.back || '(Empty back — edit to add content)'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingBack(true)}
              disabled={isDisabled}
              className="h-6 px-2 text-xs"
            >
              Edit back
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-end gap-2 border-t pt-3">
        {proposal.status === 'accepted' ? (
          <>
            <Button variant="outline" size="sm" disabled className="bg-green-100 dark:bg-green-900">
              Accepted ✓
            </Button>
            <Button variant="ghost" size="sm" onClick={onReject} disabled={isDisabled}>
              Reject
            </Button>
          </>
        ) : proposal.status === 'rejected' ? (
          <>
            <Button variant="default" size="sm" onClick={onAccept} disabled={isDisabled}>
              Accept
            </Button>
            <Button variant="outline" size="sm" disabled>
              Rejected
            </Button>
          </>
        ) : (
          <>
            <Button variant="default" size="sm" onClick={onAccept} disabled={isDisabled}>
              Accept
            </Button>
            <Button variant="ghost" size="sm" onClick={onReject} disabled={isDisabled}>
              Reject
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

// Memoize to prevent unnecessary re-renders
export const ProposalCard = memo(ProposalCardComponent);
