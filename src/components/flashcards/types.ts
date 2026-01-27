/**
 * Form data for the flashcard edit/create dialog.
 * Mirrors CreateFlashcardCommand but used as local form state.
 */
export interface FlashcardFormData {
  front: string;
  back: string;
}

/**
 * Field-level validation errors for the flashcard form.
 */
export interface FlashcardFormErrors {
  front?: string;
  back?: string;
}
