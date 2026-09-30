/**
 * Playing from the keyboard alone (the keyboard-only charter,
 * docs/qa/sessions/2026-10-01-keyboard.md): building track, and the
 * focus coming back from a dialog.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';

const edgeCount = (page: Page) =>
    page.evaluate(() => Object.keys(window.__PANIC_STORES__!.track.getState().edges).length);
const openEnds = (page: Page) => page.evaluate(() => window.__PANIC_QA__!.look().openEnds.length);

test.describe('Keyboard', () => {
    test('a part card lays its piece at the end of the track: Enter straight on, an arrow turns a curve', async ({ page, app }) => {
        void app;
        await page.getByTestId('part-card-kato-20-000').focus();
        for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
        await expect.poll(() => edgeCount(page)).toBe(3);
        // One joined line: its two ends are open
        expect(await openEnds(page)).toBe(2);

        await page.getByTestId('part-card-kato-20-120').focus();
        await page.keyboard.press('ArrowLeft');
        await expect.poll(() => edgeCount(page)).toBe(4);
        expect(await openEnds(page)).toBe(2);
    });

    test('the shop gives the focus back to the button that opened it', async ({ page, app }) => {
        void app;
        const shopButton = page.getByTestId('open-set-shelf');
        await shopButton.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog', { name: 'Hobby shop' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: 'Hobby shop' })).toHaveCount(0);
        await expect(shopButton).toBeFocused();
    });
});
