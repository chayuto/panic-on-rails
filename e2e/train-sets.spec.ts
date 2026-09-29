/**
 * Train sets shelf — open a real box, build the layout from its manual,
 * and watch the train run. Uses the real UI and the live game loop.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';

const M1 = 'kato-20-852';

const edgeCount = (page: Page) =>
    page.evaluate(() => Object.keys(window.__PANIC_STORES__!.track.getState().edges).length);

const openEnds = (page: Page) =>
    page.evaluate(() => Object.values(window.__PANIC_STORES__!.track.getState().nodes)
        .filter(n => n.connections.length === 1 && !n.bumper).length);

test.describe('Train sets shelf', () => {
    test('builds the Kato M1 oval from its box and runs the train', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        const shelf = page.getByTestId('set-shelf');
        await expect(shelf).toBeVisible();

        const box = shelf.getByTestId(`set-box-${M1}`);
        await expect(box).toContainText('20-852');
        // The contents list names real part numbers
        await box.getByText(/In the box/).click();
        await expect(box).toContainText('20-000');
        await expect(box).toContainText('20-120');

        await box.getByTestId(`set-build-${M1}`).click();
        await expect(shelf).toBeHidden();

        // 16 pieces, one closed loop, one train running
        await expect.poll(() => edgeCount(page)).toBe(16);
        expect(await openEnds(page)).toBe(0);
        await expect.poll(() => page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().isRunning)).toBe(true);
        const start = await page.evaluate(() => window.__PANIC_SIM__!.summarize().elapsed);
        await expect.poll(() => page.evaluate(() => window.__PANIC_SIM__!.summarize().elapsed)).toBeGreaterThan(start + 1);
        expect(await page.evaluate(() => window.__PANIC_SIM__!.summarize().crashed)).toBe(0);
    });

    test('asks before replacing a layout, and undo brings the old one back', async ({ page, app }) => {
        void app;
        // Something already on the table
        await page.evaluate(() => {
            window.__PANIC_STORES__!.track.addTrack('kato-20-000', { x: 200, y: 200 }, 0);
        });
        expect(await edgeCount(page)).toBe(1);

        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId(`set-build-${M1}`).click();
        // Not built yet: the shelf asks first
        await expect(page.getByRole('alertdialog', { name: 'Replace layout' })).toBeVisible();
        expect(await edgeCount(page)).toBe(1);

        await page.getByTestId('set-build-confirm').click();
        await expect.poll(() => edgeCount(page)).toBe(16);

        // Back to Edit mode, then undo the build
        await page.evaluate(() => {
            const s = window.__PANIC_STORES__!;
            s.simulation.setRunning(false);
            s.mode.enterEditMode();
            s.history.undo();
        });
        await expect.poll(() => edgeCount(page)).toBe(1);
    });

    test('buying an expansion box with hobby money: V4 adds a #4 siding to M1', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        const box = page.getByTestId('set-box-kato-20-863');
        await expect(box).toContainText('Switching Siding Set');

        // Not owned yet: can't build, can't afford it
        await expect(box.getByTestId('set-build-kato-20-863')).toBeDisabled();
        await expect(box.getByTestId('set-missing-kato-20-863')).toContainText('You still need');
        await expect(box.getByTestId('set-buy-kato-20-863')).toBeDisabled();

        // Hobby money from running trains (granted here), then buy the box
        await page.evaluate(() => window.__PANIC_STORES__!.collection.earn(10_000));
        await box.getByTestId('set-buy-kato-20-863').click();
        await expect(box.getByTestId('set-owned-kato-20-863')).toHaveText('Owned ×1');
        await box.getByTestId('set-build-kato-20-863').click();

        // M1's 16 pieces become 24 with V4 (two turnouts are two edges each)
        await expect.poll(() => edgeCount(page)).toBeGreaterThan(24);
        const switches = await page.evaluate(() => Object.values(window.__PANIC_STORES__!.track.getState().nodes)
            .filter(n => n.type === 'switch').map(n => n.connections.length));
        // Both turnouts fully joined: main, branch and the line they sit on
        expect(switches).toEqual([3, 3]);
        expect(await openEnds(page)).toBe(0);
        const start = await page.evaluate(() => window.__PANIC_SIM__!.summarize().elapsed);
        await expect.poll(() => page.evaluate(() => window.__PANIC_SIM__!.summarize().elapsed)).toBeGreaterThan(start + 1);
        expect(await page.evaluate(() => window.__PANIC_SIM__!.summarize().crashed)).toBe(0);
    });

    test('Escape closes the shelf without building', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        await expect(page.getByTestId('set-shelf')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('set-shelf')).toBeHidden();
        expect(await edgeCount(page)).toBe(0);
    });
});
