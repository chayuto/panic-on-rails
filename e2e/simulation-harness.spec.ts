/**
 * Simulation harness E2E — exercises `window.__PANIC_SIM__` and the real
 * rAF game loop in a browser.
 */

import { test, expect } from './fixtures/app-fixture.js';

test.describe('Simulation harness', () => {
    test('__PANIC_SIM__ steps a template deterministically in the page', async ({ page, app }) => {
        void app;
        const result = await page.evaluate(async () => {
            const sim = window.__PANIC_SIM__!;
            const recipe = await (await fetch('/templates/switch-showdown.json')).json();
            const once = () => {
                sim.resetWorld();
                sim.seed(7);
                sim.loadRecipe(recipe);
                const events = sim.runSeconds(20);
                return { crashed: sim.summarize().crashed, collisions: events.filter(e => e.type === 'collision').length };
            };
            return [once(), once()];
        });
        expect(result[0]).toEqual({ crashed: 2, collisions: 2 });
        expect(result[1]).toEqual(result[0]);
    });

    test('the live game loop keeps running after a crash', async ({ page, app }) => {
        void app;
        await page.getByTestId('file-template-selector').selectOption('switch-showdown');

        // Wait for the collision to happen in the real rAF loop
        await expect.poll(
            () => page.evaluate(() => window.__PANIC_SIM__!.summarize().crashed),
            { timeout: 15_000 }
        ).toBe(2);

        // Debris physics runs on frozen store state; the loop must not error out
        const debrisY = () => page.evaluate(() =>
            window.__PANIC_STORES__!.simulation.getState().crashedParts.map(p => p.position.y).join(','));
        const before = await debrisY();
        await expect.poll(debrisY, { timeout: 5_000 }).not.toBe(before);
        const state = await page.evaluate(() => {
            const s = window.__PANIC_STORES__!.simulation.getState();
            return { error: s.error, isRunning: s.isRunning };
        });
        expect(state).toEqual({ error: null, isRunning: true });
    });
});
