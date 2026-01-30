import { useEffect, useState, useId } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Loader2 } from 'lucide-react';
import type { FlashcardDTO } from '../../types';
import type { FlashcardFormData, FlashcardFormErrors } from './types';
import { createFlashcardSchema } from '../../lib/schemas/flashcard.schema';

interface FlashcardEditDialogProps {
  flashcard: FlashcardDTO | null; // null = create mode, non-null = edit mode
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FlashcardFormData) => Promise<void>;
}

/**
 * Modal dialog for creating or editing a flashcard.
 * Performs client-side validation using Zod schema before submission.
 */
export function FlashcardEditDialog({ flashcard, isOpen, onClose, onSave }: FlashcardEditDialogProps) {
  const [formData, setFormData] = useState<FlashcardFormData>({ front: '', back: '' });
  const [errors, setErrors] = useState<FlashcardFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const frontId = useId();
  const backId = useId();

  const isEditMode = flashcard !== null;
  const title = isEditMode ? 'Edit Flashcard' : 'New Flashcard';

  // Initialize/reset form when dialog opens or flashcard changes
  useEffect(() => {
    if (isOpen) {
      if (flashcard) {
        // Edit mode - pre-fill with existing data
        setFormData({ front: flashcard.front, back: flashcard.back });
      } else {
        // Create mode - empty form
        setFormData({ front: '', back: '' });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, flashcard]);

  /**
   * Validate a single field using Zod schema.
   */
  const validateField = (field: keyof FlashcardFormData, value: string) => {
    const result = createFlashcardSchema.shape[field].safeParse(value);
    if (result.success) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } else {
      const message = result.error.errors[0]?.message || 'Invalid value';
      setErrors((prev) => ({ ...prev, [field]: message }));
    }
  };

  /**
   * Validate entire form using Zod schema.
   */
  const validateForm = (): boolean => {
    const result = createFlashcardSchema.safeParse(formData);
    if (result.success) {
      setErrors({});
      return true;
    }

    const fieldErrors: FlashcardFormErrors = {};
    result.error.errors.forEach((error) => {
      const field = error.path[0] as keyof FlashcardFormData;
      fieldErrors[field] = error.message;
    });
    setErrors(fieldErrors);
    return false;
  };

  const handleFieldChange = (field: keyof FlashcardFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleFieldBlur = (field: keyof FlashcardFormData) => {
    validateField(field, formData[field]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(formData);
      onClose();
    } catch {
      // Error is handled in the hook (toast shown)
      // Keep dialog open so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Front field */}
            <div className="space-y-2">
              <Label htmlFor={frontId}>Front</Label>
              <Textarea
                id={frontId}
                value={formData.front}
                onChange={(e) => handleFieldChange('front', e.target.value)}
                onBlur={() => handleFieldBlur('front')}
                placeholder="Question or prompt"
                maxLength={500}
                rows={3}
                disabled={isSubmitting}
                className={errors.front ? 'border-destructive' : ''}
              />
              <div className="flex justify-between text-xs">
                <span className="text-destructive">{errors.front || ''}</span>
                <span className="text-muted-foreground">{formData.front.length}/500 characters</span>
              </div>
            </div>

            {/* Back field */}
            <div className="space-y-2">
              <Label htmlFor={backId}>Back</Label>
              <Textarea
                id={backId}
                value={formData.back}
                onChange={(e) => handleFieldChange('back', e.target.value)}
                onBlur={() => handleFieldBlur('back')}
                placeholder="Answer or explanation"
                maxLength={2000}
                rows={5}
                disabled={isSubmitting}
                className={errors.back ? 'border-destructive' : ''}
              />
              <div className="flex justify-between text-xs">
                <span className="text-destructive">{errors.back || ''}</span>
                <span className="text-muted-foreground">{formData.back.length}/2000 characters</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
