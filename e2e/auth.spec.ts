import { test, expect } from '@playwright/test';
import { RegisterPage } from './pages/register.page';
import { LoginPage } from './pages/login.page';
import { FlashcardsPage } from './pages/flashcards.page';
import {
  generateTestUserEmail,
  generateTestPassword,
  createTestUser,
  cleanupTestUser,
} from './helpers/auth.helper';

test.describe('Authentication', () => {
  test.describe('Registration', () => {
    test('E1: should register and see empty flashcards list (auto-login)', async ({ page }) => {
      const email = generateTestUserEmail();
      const password = generateTestPassword();

      // Step 1: Register new user
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      await registerPage.register(email, password);

      // Step 2: In test env (email confirmation disabled), user is auto-logged in
      // and redirected directly to /flashcards
      await page.waitForURL('/flashcards', { timeout: 10000 });
      await expect(page).toHaveURL('/flashcards');

      // Step 3: Should see empty state (new user has no flashcards)
      const flashcardsPage = new FlashcardsPage(page);
      await expect(flashcardsPage.emptyState).toBeVisible();

      // Cleanup: delete test user
      await cleanupTestUser(page);
    });
  });

  test.describe('Login', () => {
    let sharedEmail: string;
    let sharedPassword: string;

    // Create a user once for all login tests
    test.beforeAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const credentials = await createTestUser(page);
      sharedEmail = credentials.email;
      sharedPassword = credentials.password;

      await context.close();
    });

    // Cleanup shared user after all login tests
    test.afterAll(async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Login to get session cookie, then cleanup
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(sharedEmail, sharedPassword);
      await loginPage.waitForSuccessfulLogin();

      await cleanupTestUser(page);
      await context.close();
    });

    test('E2: should login with correct credentials and redirect to /flashcards', async ({
      page,
    }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(sharedEmail, sharedPassword);
      await loginPage.waitForSuccessfulLogin();

      // Verify redirect to flashcards page
      await expect(page).toHaveURL('/flashcards');

      // Verify page loaded (check for key element)
      const flashcardsPage = new FlashcardsPage(page);
      await expect(flashcardsPage.newFlashcardButton).toBeVisible();
    });

    test('E3: should show error message with invalid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Attempt login with wrong password
      await loginPage.login(sharedEmail, 'WrongPassword123!');

      // Should stay on login page
      await expect(page).toHaveURL('/login');

      // Should display error message
      await expect(loginPage.errorMessage).toBeVisible();
    });
  });
});
