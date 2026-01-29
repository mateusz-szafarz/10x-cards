import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ProposalCard } from './ProposalCard';
import type { FlashcardProposalViewModel } from './types';

interface ProposalListProps {
  proposals: FlashcardProposalViewModel[];
  acceptedCount: number;
  isSaving: boolean;
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
  onEditFront: (index: number, value: string) => void;
  onEditBack: (index: number, value: string) => void;
  onSave: () => void;
}

/**
 * Container component that renders the list of AI-generated proposals
 * with a summary header and a save button.
 */
export function ProposalList({
  proposals,
  acceptedCount,
  isSaving,
  onAccept,
  onReject,
  onEditFront,
  onEditBack,
  onSave,
}: ProposalListProps) {
  const totalCount = proposals.length;

  return (
    <div className="space-y-6">
      {/* Header with counts */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Flashcard proposals ({totalCount})</h2>
        <div aria-live="polite" className="text-muted-foreground text-sm">
          Accepted: <span className="text-foreground font-medium">{acceptedCount}</span>
        </div>
      </div>

      {/* Proposals grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {proposals.map((proposal, index) => (
          <ProposalCard
            key={index}
            proposal={proposal}
            isDisabled={isSaving}
            onAccept={() => onAccept(index)}
            onReject={() => onReject(index)}
            onEditFront={(value) => onEditFront(index, value)}
            onEditBack={(value) => onEditBack(index, value)}
          />
        ))}
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-4">
        <Button onClick={onSave} disabled={acceptedCount === 0 || isSaving} size="lg" className="min-w-[200px]">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            `Save accepted (${acceptedCount})`
          )}
        </Button>
      </div>
    </div>
  );
}
