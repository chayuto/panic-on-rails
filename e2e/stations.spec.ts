/**
 * Station stops through the real UI: put a platform on the M1 oval, and the
 * starter train calls there and its passengers pay.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';
import { clickWorld } from './helpers/canvas.js';

const stations = (page: Page) => page.evaluate(() =>
    Object.values(window.__PANIC_STORES__!.logic.getState().stations).map(s => s.name));

test.describe('Stations', () => {
    test('a platform on the M1 oval: the train calls there and its passengers pay', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-852').click();
        await expect.poll(() => page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().isRunning)).toBe(true);

        // Back at the workbench, the Station tool and a click on a straight
        await page.getByTestId('mode-edit-btn').click();
        await page.getByTestId('edit-tool-station').click();
        const middle = await page.evaluate(() => {
            const { edges, nodes } = window.__PANIC_STORES__!.track.getState();
            const straight = Object.values(edges).find(e => e.partId === 'kato-20-000')!;
            const a = nodes[straight.startNodeId].position;
            const b = nodes[straight.endNodeId].position;
            return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        });
        await clickWorld(page, middle);
        await expect.poll(() => stations(page)).toEqual(['Station 1']);
        // Clicking there again doesn't stack a second platform on the first
        await clickWorld(page, middle);
        expect(await stations(page)).toEqual(['Station 1']);
        const seen = await page.evaluate(() => window.__PANIC_QA__!.look().stations);
        expect(seen).toEqual([expect.objectContaining({ name: 'Station 1', at: expect.objectContaining({ onScreen: true }) })]);

        // Running again, the train calls at the station and the passengers pay
        await page.getByTestId('mode-simulate-btn').click();
        await page.evaluate(() => window.__PANIC_STORES__!.simulation.setSpeedMultiplier(3));
        await expect(page.locator('[data-testid^="train-status-"]').first()).toHaveAttribute('title', 'At Station 1', { timeout: 30_000 });
        const calls = await page.evaluate(() =>
            window.__PANIC_STORES__!.simulation.getState().simLog.filter(e => e.type === 'station').map(e => e.detail));
        expect(calls[0]).toMatch(/^called at Station 1: fares \$\d+\.\d\d$/);
    });
});
