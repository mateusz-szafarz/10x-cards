import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the login page.
 * Encapsulates interactions with /login route.
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.submitButton = page.getByTestId('login-submit-button');
    this.errorMessage = page.getByText(/invalid|incorrect|failed|unable to connect/i);
  }

  async goto() {
    await this.page.goto('/login');
    // Wait for React hydration - ensure form is interactive
    await this.page.waitForLoadState('networkidle');
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async login(email: string, password: string) {
    // Ensure inputs are ready before filling
    await this.emailInput.waitFor({ state: 'visible' });

    // Use pressSequentially (instead of fill) to properly trigger React onChange events
    await this.emailInput.clear();
    await this.emailInput.pressSequentially(email, { delay: 10 });

    await this.passwordInput.clear();
    await this.passwordInput.pressSequentially(password, { delay: 10 });

    await this.submitButton.click();
  }

  async waitForSuccessfulLogin() {
    // In test environment (email confirmation disabled), /login redirects to /flashcards
    await this.page.waitForURL('/flashcards', { timeout: 10000 });
  }
}
