import { type Page } from '@playwright/test';

/**
 * Generates a unique test user email.
 * Uses timestamp for uniqueness in sequential test runs.
 */
export function generateTestUserEmail(): string {
  return `test-${Date.now()}@example.com`;
}

/**
 * Generates a test password that meets validation requirements.
 * Password schema: min 8 characters (from auth.schema.ts)
 */
export function generateTestPassword(): string {
  return 'TestPassword123!';
}

/**
 * Creates a test user via API registration endpoint.
 * Returns credentials for subsequent login.
 */
export async function createTestUser(page: Page) {
  const email = generateTestUserEmail();
  const password = generateTestPassword();

  const response = await page.request.post('/api/auth/register', {
    data: { email, password },
  });

  if (!response.ok()) {
    const body = await response.json();
    throw new Error(`Failed to create test user: ${JSON.stringify(body)}`);
  }

  return { email, password };
}

/**
 * Deletes the currently authenticated test user via API.
 * Should be called in afterEach to cleanup test data.
 */
export async function cleanupTestUser(page: Page) {
  // User must be authenticated (has session cookie)
  const response = await page.request.delete('/api/auth/account');

  if (!response.ok() && response.status() !== 401) {
    // 401 is acceptable (user already deleted or not logged in)
    console.warn(`Failed to cleanup test user: ${response.status()}`);
  }
}
