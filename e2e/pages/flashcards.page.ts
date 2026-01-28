import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the flashcards page.
 * Encapsulates interactions with /flashcards route.
 */
export class FlashcardsPage {
  readonly page: Page;
  readonly newFlashcardButton: Locator;
  readonly searchInput: Locator;
  readonly flashcardCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newFlashcardButton = page.getByTestId('new-flashcard-button');
    this.searchInput = page.getByPlaceholder(/search/i);
    this.flashcardCards = page.getByTestId('flashcard-card');
    this.emptyState = page.getByText(/no flashcards yet/i);
  }

  async goto() {
    await this.page.goto('/flashcards');
  }

  async createFlashcard(front: string, back: string) {
    await this.newFlashcardButton.click();
    await this.page.getByLabel(/front/i).fill(front);
    await this.page.getByLabel(/back/i).fill(back);
    await this.page.getByRole('button', { name: /save|create/i }).click();
  }

  async searchFlashcards(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounce (300ms according to useFlashcards hook)
    await this.page.waitForTimeout(400);
  }

  async getFlashcardCount(): Promise<number> {
    return this.flashcardCards.count();
  }

  async hasEmptyState(): Promise<boolean> {
    return this.emptyState.isVisible();
  }
}
