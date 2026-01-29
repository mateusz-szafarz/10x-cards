/**
 * Status of a flashcard proposal during user review.
 * - 'pending': not yet reviewed by user
 * - 'accepted': user accepted the proposal for saving
 * - 'rejected': user rejected the proposal
 */
export type ProposalStatus = 'pending' | 'accepted' | 'rejected';

/**
 * ViewModel extending FlashcardProposalDTO with client-side review status.
 * Used by ProposalList and ProposalCard components.
 * The front/back fields may contain user-edited values.
 */
export interface FlashcardProposalViewModel {
  front: string;
  back: string;
  status: ProposalStatus;
}

/**
 * Represents the overall state of the generation view.
 * Controls which UI section is displayed.
 * - 'idle': initial state, only form visible
 * - 'generating': API call in progress, skeleton loading
 * - 'generated': proposals received and displayed
 * - 'saving': accepted proposals being saved
 * - 'error': generation failed (displayed as Alert in UI).
 *   Note: Save errors do NOT set this state — they use toast notifications
 *   and revert viewState to 'generated', keeping proposals visible.
 */
export type GenerateViewState = 'idle' | 'generating' | 'generated' | 'saving' | 'error';
