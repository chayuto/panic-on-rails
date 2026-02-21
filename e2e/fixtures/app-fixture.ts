import { test as base, expect } from '@playwright/test';

/**
 * Custom Playwright test fixtures for PanicOnRails E2E tests.
 *
 * Provides:
 * - `app`: A page navigated to the app with localStorage cleared for clean state
 *
 * Extend this fixture to add more shared setup/teardown as the test suite grows.
 */
export const test = base.extend<{ app: void }>({
    app: [async ({ page }, use) => {
        // Navigate to the app
        await page.goto('/');

        // Clear localStorage to ensure clean state (no persisted layouts)
        await page.evaluate(() => localStorage.clear());

        // Reload to pick up clean state
        await page.reload();

        // Wait for the app to be fully rendered
        await expect(page.getByTestId('app')).toBeVisible();

        await use();
    }, { auto: false }],
});

export { expect };
