/**
 * Simulation controls — the player's ways to prevent a crash, exercised
 * through the real UI and the live rAF game loop.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';
import { clickTrain, clickWorld } from './helpers/canvas.js';

/**
 * Load a template and wait until its trains are running. A template spawns
 * its trains at once but starts them a moment later, and the view refits
 * then: acting before that races the start.
 */
async function loadTemplate(page: Page, id: string) {
    await page.getByTestId('file-template-selector').selectOption(id);
    await expect.poll(() => page.evaluate(() => {
        const sim = window.__PANIC_STORES__!.simulation.getState();
        return Object.keys(sim.trains).length > 0 && sim.isRunning;
    })).toBe(true);
}

test.describe('Simulation controls', () => {
    test('Switch Showdown: clicking the west switch mid-run averts the crash', async ({ page, app }) => {
        void app;
        await loadTemplate(page, 'switch-showdown');
        const sw = await page.evaluate(() => {
            const nodes = Object.values(window.__PANIC_STORES__!.track.getState().nodes);
            return nodes.filter(n => n.type === 'switch').sort((a, b) => a.position.x - b.position.x)[0];
        });

        await clickWorld(page, sw.position);
        await expect.poll(() => page.evaluate((id) =>
            window.__PANIC_STORES__!.track.getState().nodes[id].switchState, sw.id)).toBe(1);

        // Fast-forward: without the flip they meet after ~9 s of sim time
        await page.evaluate(() => window.__PANIC_STORES__!.simulation.setSpeedMultiplier(3));
        await expect.poll(() => page.evaluate(() => window.__PANIC_SIM__!.summarize().elapsed),
            { timeout: 15_000 }).toBeGreaterThan(20);
        expect(await page.evaluate(() => window.__PANIC_SIM__!.summarize().crashed)).toBe(0);
    });

    test('a red signal holds a train and green releases it', async ({ page, app }) => {
        void app;
        await loadTemplate(page, 'simple-oval');
        const signalId = await page.evaluate(() => {
            const s = window.__PANIC_STORES__!;
            const train = Object.values(s.simulation.getState().trains)[0];
            const edge = s.track.getState().edges[train.currentEdgeId];
            const ahead = train.direction === 1 ? edge.endNodeId : edge.startNodeId;
            const id = s.logic.addSignal(ahead);
            s.logic.setSignalState(id, 'red');
            return id;
        });

        await expect.poll(() => page.evaluate(() =>
            Object.values(window.__PANIC_STORES__!.simulation.getState().trains)[0].heldAtSignal)).toBe(true);

        await page.evaluate((id) => window.__PANIC_STORES__!.logic.setSignalState(id, 'green'), signalId);
        await expect.poll(() => page.evaluate(() =>
            Object.values(window.__PANIC_STORES__!.simulation.getState().trains)[0].heldAtSignal)).toBe(false);
    });

    test('per-train Stop holds a train in place; Go resumes it', async ({ page, app }) => {
        void app;
        await loadTemplate(page, 'simple-oval');
        const id = await page.evaluate(() => Object.keys(window.__PANIC_STORES__!.simulation.getState().trains)[0]);
        const position = () => page.evaluate((t) => {
            const train = window.__PANIC_STORES__!.simulation.getState().trains[t];
            return `${train.currentEdgeId}:${train.distanceAlongEdge.toFixed(2)}`;
        }, id);

        await page.getByTestId(`train-stop-${id}`).click();
        const held = await position();
        await page.waitForTimeout(300); // real rAF frames must not move it
        expect(await position()).toBe(held);

        await page.getByTestId(`train-stop-${id}`).click();
        await expect.poll(position).not.toBe(held);
    });

    test('in Simulate mode a click on a signal changes it, whatever tool was last used', async ({ page, app }) => {
        void app;
        await loadTemplate(page, 'simple-oval');
        await page.getByTestId('mode-edit-btn').click();
        await page.getByTestId('edit-tool-signal').click();
        const signal = await page.evaluate(() => {
            const s = window.__PANIC_STORES__!;
            const node = Object.values(s.track.getState().nodes)[0];
            const id = s.logic.addSignal(node.id);
            const { offset } = s.logic.getState().signals[id];
            return { id, at: { x: node.position.x + offset.x, y: node.position.y + offset.y } };
        });
        await page.getByTestId('mode-simulate-btn').click();

        await clickWorld(page, signal.at);
        await expect.poll(() => page.evaluate((id) => window.__PANIC_STORES__!.logic.getState().signals[id]?.state ?? 'removed', signal.id))
            .toBe('green');
    });

    test('a click on a train stops it, and another starts it again', async ({ page, app }) => {
        void app;
        await loadTemplate(page, 'simple-oval');
        await page.getByTestId('sim-play-pause').click(); // paused, so it holds still to be clicked
        const id = await page.evaluate(() => Object.keys(window.__PANIC_STORES__!.simulation.getState().trains)[0]);
        const stopped = () => page.evaluate((t) => !!window.__PANIC_STORES__!.simulation.getState().trains[t].stopped, id);

        await clickTrain(page, id);
        await expect.poll(stopped).toBe(true);
        await expect(page.getByTestId(`train-stop-${id}`)).toHaveAttribute('aria-pressed', 'true');

        await clickTrain(page, id);
        await expect.poll(stopped).toBe(false);
    });

    test('pausing from the toolbar stays in Simulate mode', async ({ page, app }) => {
        void app;
        await loadTemplate(page, 'simple-oval');
        await page.getByTestId('sim-play-pause').click();
        const state = await page.evaluate(() => ({
            mode: window.__PANIC_STORES__!.mode.getState().primaryMode,
            running: window.__PANIC_STORES__!.simulation.getState().isRunning,
        }));
        expect(state).toEqual({ mode: 'simulate', running: false });
    });

    test('Add Train twice never stacks trains on the same spot', async ({ page, app }) => {
        void app;
        await loadTemplate(page, 'simple-oval');
        await page.getByTestId('sim-play-pause').click(); // pause
        await page.getByTestId('sim-add-train').click();
        await page.getByTestId('sim-add-train').click();
        const spots = await page.evaluate(() =>
            Object.values(window.__PANIC_STORES__!.simulation.getState().trains).map(t => t.currentEdgeId));
        expect(spots).toHaveLength(3);
        expect(new Set(spots).size).toBe(3);
    });
});
