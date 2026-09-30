/**
 * Operating sessions through the real UI: a timed shift on the starter
 * oval, tallied, and a bonus for getting through it without a wreck.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';

const wallet = (page: Page) => page.evaluate(() => window.__PANIC_STORES__!.collection.getState().wallet);

test.describe('Operating sessions', () => {
    test('a clean session on the M1 oval pays its bonus', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-852').click();
        await expect.poll(() => page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().isRunning)).toBe(true);

        await page.getByTestId('session-start').click();
        await expect(page.getByTestId('session')).toContainText(/Session · (10:00|9:5\d) left/);
        await expect(page.getByTestId('session-tally')).toContainText('0 calls · 0 wrecks');

        // Pause the loop and run the ten railway minutes headlessly
        const before = await wallet(page);
        await page.evaluate(() => {
            window.__PANIC_STORES__!.simulation.setRunning(false);
            window.__PANIC_SIM__!.runSeconds(10 * 60 + 1);
        });
        const result = page.getByTestId('session-result');
        await expect(result).toContainText('Session over');
        await expect(page.getByTestId('session-bonus')).toContainText(/^Crash-free: \$\d+\.\d\d bonus$/);
        expect(await wallet(page)).toBeGreaterThan(before);

        // And another
        await page.getByTestId('session-start').click();
        await expect(page.getByTestId('session')).toBeVisible();
        await expect(result).toBeHidden();
    });
});
