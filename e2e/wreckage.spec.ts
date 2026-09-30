/**
 * Wrecks block the line until the player clears them, and the train panel
 * keeps the dispatcher's record.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';

const trains = (page: Page) => page.evaluate(() =>
    Object.values(window.__PANIC_STORES__!.simulation.getState().trains)
        .map(t => ({ id: t.id, crashed: !!t.crashed, stopped: !!t.stopped, speed: t.speed })));

test.describe('Wreckage', () => {
    test('Switch Showdown\'s wrecks stay on the line until re-railed', async ({ page, app }) => {
        void app;
        await page.getByTestId('file-template-selector').selectOption('switch-showdown');
        await expect.poll(() => page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().isRunning)).toBe(true);

        // Pause the loop and step the real simulation on to the crash
        const summary = await page.evaluate(() => {
            window.__PANIC_STORES__!.simulation.setRunning(false);
            const sim = window.__PANIC_SIM__!;
            sim.seed(1);
            sim.runSeconds(20);
            return sim.summarize();
        });
        expect(summary).toMatchObject({ crashed: 2, wrecks: 2 });
        await expect(page.getByTestId('wreck-warning')).toContainText('2 wrecks are blocking the line');
        await expect(page.getByTestId('wreck-record')).toContainText(/Crash-free for 0:\d\d · 2 trains wrecked/);

        // Play goes on with the wrecks where they lie
        await page.getByTestId('train-play-btn').click();
        await expect.poll(() => page.evaluate(() => window.__PANIC_SIM__!.summarize().elapsed)).toBeGreaterThan(summary.elapsed + 0.5);
        expect((await trains(page)).every(t => t.crashed)).toBe(true);

        // Re-railed: back on the track, standing, the debris swept up
        await page.getByTestId('rerail-all').click();
        await expect(page.getByTestId('wreck-warning')).toBeHidden();
        const rerailed = await trains(page);
        expect(rerailed).toHaveLength(2);
        expect(rerailed.every(t => !t.crashed && t.stopped && t.speed === 0)).toBe(true);
        expect(await page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().crashedParts.length)).toBe(0);
        // The record remembers them
        await expect(page.getByTestId('wreck-record')).toContainText('2 trains wrecked');

        // And they run again when told to
        for (const { id } of rerailed) await page.getByTestId(`train-stop-${id}`).click();
        await expect.poll(async () => (await trains(page)).every(t => t.speed > 0)).toBe(true);
    });

    test('a wreck taken off the track goes, debris and all', async ({ page, app }) => {
        void app;
        await page.getByTestId('file-template-selector').selectOption('switch-showdown');
        await expect.poll(() => page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().isRunning)).toBe(true);
        await page.evaluate(() => {
            window.__PANIC_STORES__!.simulation.setRunning(false);
            window.__PANIC_SIM__!.runSeconds(20);
        });
        const [first, second] = await trains(page);
        await page.getByTestId(`train-remove-${first.id}`).click();
        await expect(page.getByTestId('wreck-warning')).toContainText('A wreck is blocking the line');
        await page.getByTestId(`train-remove-${second.id}`).click();
        await expect(page.getByTestId('wreck-warning')).toBeHidden();
        expect(await page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().crashedParts.length)).toBe(0);
    });
});
