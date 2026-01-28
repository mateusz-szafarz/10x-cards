import { AlertCircle, Info } from "lucide-react";
import { useGenerateFlashcards } from "../../hooks/useGenerateFlashcards";
import { GenerationForm } from "./GenerationForm";
import { ProposalList } from "./ProposalList";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

/**
 * Top-level React container component for the generation view.
 * Orchestrates the entire generation flow by wiring the useGenerateFlashcards
 * hook to child components. Handles conditional rendering based on viewState.
 */
export function GenerateView() {
  const {
    sourceText,
    proposals,
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
  } = useGenerateFlashcards();

  const hasProposals = proposals.length > 0;
  const isGenerating = viewState === "generating";
  const isSaving = viewState === "saving";
  const isError = viewState === "error";

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Generate flashcards</h1>
        <p className="text-muted-foreground">
          Paste your study material and let AI generate flashcard proposals for you to review.
        </p>
      </div>

      {/* Generation form - always visible */}
      <GenerationForm
        sourceText={sourceText}
        onSourceTextChange={setSourceText}
        onGenerate={generate}
        isLoading={isGenerating}
        hasProposals={hasProposals}
        isDisabled={isSaving}
      />

      {/* Dynamic content area based on viewState */}
      <div aria-live="polite">
        {/* Loading state - skeleton cards */}
        {isGenerating && (
          <div className="space-y-6">
            <div className="h-8 w-48">
              <Skeleton className="h-full w-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-4 rounded-lg border p-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && errorMessage && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Generation failed</AlertTitle>
            <AlertDescription>
              <p>{errorMessage}</p>
              <Button variant="outline" size="sm" onClick={generate} className="mt-3">
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Generated state with no proposals */}
        {(viewState === "generated" || isSaving) && !hasProposals && (
          <Alert>
            <Info />
            <AlertTitle>No proposals generated</AlertTitle>
            <AlertDescription>
              <p>
                No flashcard proposals were generated from this text. Try with different or more detailed source
                material.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Generated state with proposals */}
        {(viewState === "generated" || isSaving) && hasProposals && (
          <ProposalList
            proposals={proposals}
            acceptedCount={acceptedCount}
            isSaving={isSaving}
            onAccept={acceptProposal}
            onReject={rejectProposal}
            onEditFront={editProposalFront}
            onEditBack={editProposalBack}
            onSave={saveAccepted}
          />
        )}
      </div>
    </div>
  );
}
