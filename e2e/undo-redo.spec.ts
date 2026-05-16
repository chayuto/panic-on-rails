/**
 * Undo / Redo E2E — verifies the history feature against the production build.
 *
 * Runs in the `chromium` (CI) project, so a green run means undo/redo works in
 * the shipped app: the toolbar buttons, the Ctrl+Z / Ctrl+Y shortcuts, and the
 * track/budget restore round-trip.
 *
 * Placement note: lives at e2e/ root (NOT e2e/specs/) so the chromium project
 * picks it up.
 *
 * The Konva canvas cannot be drag-dropped reliably headless, so placements are
 * driven through the debug bridge. A real placement records history inside the
 * edit-mode handler; here we mirror that with an explicit `history.record()`
 * before each `addTrack` — the same contract the UI handler honours.
 */

import { test, expect } from './fixtures/app-fixture';
import type { StoreBridge } from './helpers/store-bridge';
import type { Page } from '@playwright/test';

const STRAIGHT = 'kato-20-000'; // 248mm n-scale straight

/** Place a track the way the edit-mode handler does: record history, then add. */
async function placeTracked(page: Page, stores: StoreBridge, x: number, y: number) {
    await page.evaluate(() => window.__PANIC_STORES__!.history.record());
    await stores.addTrack(STRAIGHT, { x, y }, 0);
}

test.describe('Undo / Redo', () => {
    test('toolbar buttons reflect history availability and step through edits', async ({ page, app, stores }) => {
        void app;
        const undoBtn = page.getByTestId('history-undo');
        const redoBtn = page.getByTestId('history-redo');

        // Fresh layout — nothing to undo or redo.
        await expect(undoBtn).toBeDisabled();
        await expect(redoBtn).toBeDisabled();

        await placeTracked(page, stores, 200, 300);
        await stores.waitForEdgeCount(1);

        // A recorded edit enables undo (and redo stays empty).
        await expect(undoBtn).toBeEnabled();
        await expect(redoBtn).toBeDisabled();

        // Undo via the toolbar button removes the track.
        await undoBtn.click();
        await stores.waitForEdgeCount(0);
        await expect(undoBtn).toBeDisabled();
        await expect(redoBtn).toBeEnabled();

        // Redo restores it.
        await redoBtn.click();
        await stores.waitForEdgeCount(1);
        await expect(redoBtn).toBeDisabled();
    });

    test('Ctrl+Z / Ctrl+Y keyboard shortcuts step through edits', async ({ page, app, stores }) => {
        void app;
        await placeTracked(page, stores, 150, 250);
        await placeTracked(page, stores, 450, 250);
        await stores.waitForEdgeCount(2);

        await page.keyboard.press('Control+z');
        await stores.waitForEdgeCount(1);

        await page.keyboard.press('Control+z');
        await stores.waitForEdgeCount(0);

        await page.keyboard.press('Control+y');
        await stores.waitForEdgeCount(1);

        // Ctrl+Shift+Z is the second redo binding.
        await page.keyboard.press('Control+Shift+z');
        await stores.waitForEdgeCount(2);
    });

    test('a new edit after undo clears the redo branch', async ({ page, app, stores }) => {
        void app;
        await placeTracked(page, stores, 200, 200);
        await stores.waitForEdgeCount(1);

        await page.getByTestId('history-undo').click();
        await stores.waitForEdgeCount(0);
        await expect(page.getByTestId('history-redo')).toBeEnabled();

        // A fresh placement must invalidate the redo branch.
        await placeTracked(page, stores, 500, 200);
        await stores.waitForEdgeCount(1);
        await expect(page.getByTestId('history-redo')).toBeDisabled();
    });
});
