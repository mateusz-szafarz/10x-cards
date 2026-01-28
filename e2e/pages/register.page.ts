import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object Model for the registration page.
 * Encapsulates interactions with /register route.
 */
export class RegisterPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('register-email-input');
    this.passwordInput = page.getByTestId('register-password-input');
    this.submitButton = page.getByTestId('register-submit-button');
    this.errorMessage = page.getByText(/error|failed|already exists|unable to connect/i);
  }

  async goto() {
    await this.page.goto('/register');
    // Wait for React hydration - ensure form is interactive
    await this.page.waitForLoadState('networkidle');
    await this.emailInput.waitFor({ state: 'visible' });
  }

  async register(email: string, password: string) {
    // Ensure inputs are ready before filling
    await this.emailInput.waitFor({ state: 'visible' });

    // Use pressSequentially (instead of fill) to properly trigger React onChange events
    await this.emailInput.clear();
    await this.emailInput.pressSequentially(email, { delay: 10 });

    await this.passwordInput.clear();
    await this.passwordInput.pressSequentially(password, { delay: 10 });

    await this.submitButton.click();
  }

  async waitForRedirect() {
    // After successful registration, user is redirected to /login after 1s delay
    await this.page.waitForURL('/login', { timeout: 10000 });
  }
}
