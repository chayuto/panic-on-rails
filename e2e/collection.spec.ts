/**
 * The hobby loop through the real UI: build with the pieces you own, run
 * trains to earn hobby money, buy more in the shop.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';

const edgeCount = (page: Page) =>
    page.evaluate(() => Object.keys(window.__PANIC_STORES__!.track.getState().edges).length);

const wallet = (page: Page) =>
    page.evaluate(() => window.__PANIC_STORES__!.collection.getState().wallet);

async function dropStraight(page: Page, x: number, y: number) {
    await page.getByTestId('part-card-kato-20-000').dragTo(page.locator('.konvajs-content'), {
        targetPosition: { x, y },
        force: true,
    });
}

test.describe('Collection', () => {
    test('placing track uses pieces from the box; when they run out, the card is spent', async ({ page, app }) => {
        void app;
        const left = page.getByTestId('part-left-kato-20-000');
        await expect(left).toHaveText('×4');

        // Four S248s in the M1 box, dropped far apart so they don't join
        for (const [i, y] of [120, 220, 320, 420].entries()) {
            await dropStraight(page, 300, y);
            await expect(left).toHaveText(`×${3 - i}`);
        }
        expect(await edgeCount(page)).toBe(4);
        await expect(page.getByTestId('part-card-kato-20-000')).toHaveAttribute('aria-disabled', 'true');

        // A fifth one can't be placed
        await dropStraight(page, 300, 520);
        expect(await edgeCount(page)).toBe(4);

        // Undo returns a piece to the box
        await page.keyboard.press('Control+z');
        await expect(left).toHaveText('×1');
    });

    test('running a train earns hobby money', async ({ page, app }) => {
        void app;
        const start = await wallet(page);
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-852').click();

        // Faster than real time so the test is quick
        await page.evaluate(() => window.__PANIC_STORES__!.simulation.setSpeedMultiplier(4));
        await expect.poll(() => wallet(page), { timeout: 15_000 }).toBeGreaterThan(start + 100);
        await expect(page.getByTestId('wallet-balance')).not.toHaveText('$20.00');
    });

    test('trains are yours too: run the one you own, buy another to run two', async ({ page, app }) => {
        void app;
        const trainCount = () => page.evaluate(() => Object.keys(window.__PANIC_STORES__!.simulation.getState().trains).length);
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-852').click();

        // The M1 plan's train is the starter diesel you own
        await expect.poll(trainCount).toBe(1);
        await expect(page.getByTestId('stock-left-diesel-passenger')).toHaveText('0/1');

        // Every train you own is running: Add Train takes you to the shop's trains
        await page.getByTestId('train-add-btn').click();
        await expect(page.getByTestId('shop-tab-trains')).toHaveAttribute('aria-selected', 'true');
        expect(await trainCount()).toBe(1);

        await page.evaluate(() => window.__PANIC_STORES__!.collection.earn(20_000));
        await page.getByTestId('shop-buy-train-commuter').click();
        await page.getByTestId('set-shelf-close').click();
        await page.getByTestId('run-stock-commuter').click();
        await expect.poll(trainCount).toBe(2);
    });

    test('a loose part bought in the shop shows up in the bin', async ({ page, app }) => {
        void app;
        await expect(page.getByTestId('part-card-kato-20-202')).toHaveCount(0);

        await page.evaluate(() => window.__PANIC_STORES__!.collection.earn(5_000));
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('shop-tab-parts').click();
        await page.getByTestId('shop-buy-kato-20-202').click();
        await page.getByTestId('set-shelf-close').click();

        await expect(page.getByTestId('part-left-kato-20-202')).toHaveText('×1');
        expect(await wallet(page)).toBe(2000 + 5000 - 3300);
    });
});
