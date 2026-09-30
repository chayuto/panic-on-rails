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
 * - `consoleGate` (automatic): fails the test on any page error or console
 *   error. A test that means to cause one lists it in `allowedConsoleErrors`.
 */
export const test = base.extend<{
    app: void;
    stores: StoreBridge;
    snap: (label: string) => Promise<{
        screenshotPath: string;
        statePath: string;
        state: import('../helpers/types').AllStoresSnapshot;
    }>;
    allowedConsoleErrors: RegExp[];
    consoleGate: void;
}>({
    allowedConsoleErrors: [[], { option: true }],

    consoleGate: [async ({ page, allowedConsoleErrors }, use) => {
        const problems: string[] = [];
        const record = (text: string) => {
            if (!allowedConsoleErrors.some(pattern => pattern.test(text))) problems.push(text);
        };
        page.on('pageerror', err => record(`page error: ${err.message}`));
        page.on('console', msg => {
            if (msg.type() === 'error') record(`console error: ${msg.text()}`);
        });
        await use();
        expect(problems, 'the page logged errors').toEqual([]);
    }, { auto: true }],

    app: [async ({ page }, use) => {
        // Navigate to the app. The `?e2e` param activates the debug bridge in
        // production/preview builds (it is always on in dev mode) — required so
        // CI tests against the built app can read/write Zustand stores.
        await page.goto('/?e2e');

        // Clear localStorage to ensure clean state (no persisted layouts)
        await page.evaluate(() => localStorage.clear());

        // Reload to pick up clean state (query string is preserved)
        await page.reload();

        // Wait for the app to be fully rendered
        await expect(page.getByTestId('app')).toBeVisible();

        await use();
    }, { auto: false }],

    stores: async ({ page }, use) => {
        const bridge = new StoreBridge(page);
        // Navigate if not already on the app (?e2e activates the debug bridge)
        if (page.url() === 'about:blank') {
            await page.goto('/?e2e');
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
