import { test as base, expect } from '@playwright/test';
import { StoreBridge } from '../helpers/store-bridge';
import { ScreenshotManager } from '../helpers/screenshot-manager';

/**
 * Custom Playwright test fixtures for PanicOnRails E2E tests.
 *
 * Fixtures:
 * - `app`: Navigates to app, clears localStorage, waits for render
 * - `stores`: Typed access to all Zustand stores via debug bridge
 * - `snap`: Screenshot + state capture helper (saves .png + .state.json)
 */
export const test = base.extend<{
    app: void;
    stores: StoreBridge;
    snap: (label: string) => Promise<{
        screenshotPath: string;
        statePath: string;
        state: import('../helpers/types').AllStoresSnapshot;
    }>;
}>({
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

    stores: async ({ page }, use) => {
        const bridge = new StoreBridge(page);
        // Navigate if not already on the app
        if (page.url() === 'about:blank') {
            await page.goto('/');
        }
        await bridge.waitForBridge();
        await use(bridge);
    },

    snap: async ({ page, stores }, use, testInfo) => {
        const manager = new ScreenshotManager(page, stores, testInfo.title);
        await use((label: string) => manager.capture(label));
    },
});

export { expect };
