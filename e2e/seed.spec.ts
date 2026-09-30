/**
 * Seed for the Playwright test agents: a fresh app, with the debug bridge
 * and the canvas lens (`window.__PANIC_QA__.look()`) ready.
 */

import { test, expect } from './fixtures/app-fixture.js';

test.describe('Test group', () => {
    test('seed', async ({ page, app }) => {
        void app;
        await expect.poll(() => page.evaluate(() => !!window.__PANIC_QA__)).toBe(true);
        // generate code here.
    });
});
