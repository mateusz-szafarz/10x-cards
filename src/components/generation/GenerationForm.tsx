import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface GenerationFormProps {
  sourceText: string;
  onSourceTextChange: (text: string) => void;
  onGenerate: () => void;
  isLoading: boolean; // true when viewState === 'generating'
  hasProposals: boolean; // true when proposals exist (changes button text)
  isDisabled: boolean; // true when viewState === 'saving'
}

/**
 * Form component containing the source text textarea, character counter,
 * and generate/regenerate button. Handles source text validation.
 */
export function GenerationForm({
  sourceText,
  onSourceTextChange,
  onGenerate,
  isLoading,
  hasProposals,
  isDisabled,
}: GenerationFormProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  const charCount = sourceText.length;
  const isUnderMinimum = charCount > 0 && charCount < 1000;

  const handleChange = (value: string) => {
    onSourceTextChange(value);
    // Clear validation error when user types
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleBlur = () => {
    // Only validate on blur if text is not empty
    if (sourceText.length > 0 && sourceText.length < 1000) {
      setValidationError("Source text must be between 1000 and 10000 characters");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="source-text">Paste your source text (1000-10000 characters)</Label>
        <Textarea
          id="source-text"
          value={sourceText}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          maxLength={10000}
          rows={8}
          placeholder="Paste your study material, article, lecture notes, or any text you want to turn into flashcards..."
          className={cn(validationError && "border-destructive")}
          disabled={isDisabled}
        />

        {/* Character counter */}
        <div className="flex items-center justify-between">
          <div className={cn("text-xs", isUnderMinimum ? "text-destructive" : "text-muted-foreground")}>
            {charCount}/10000 characters (min. 1000)
          </div>
          {validationError && <span className="text-xs text-destructive">{validationError}</span>}
        </div>
      </div>

      {/* Generate button */}
      <Button onClick={onGenerate} disabled={isLoading || isDisabled} size="lg" className="w-full sm:w-auto">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : hasProposals ? (
          "Generate again"
        ) : (
          "Generate flashcards"
        )}
      </Button>
    </div>
  );
}
