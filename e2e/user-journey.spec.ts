/**
 * User-journey E2E — exercises the app the way a real user would and proves
 * the core features work end-to-end. Runs in the `chromium` (CI) project
 * against the production build, so a green run means the shipped app works.
 *
 * Placement note: this file lives at e2e/ root (NOT e2e/specs/), so the
 * chromium project picks it up while the dev project ignores it.
 */

import { test, expect } from './fixtures/app-fixture';

const STRAIGHT = 'kato-20-000'; // 248mm n-scale straight

test.describe('User journey: building track', () => {
    test('app boots into a usable, empty edit workspace', async ({ page, app, stores }) => {
        void app;
        await expect(page.getByTestId('app')).toBeVisible();
        await expect(page.getByTestId('toolbar')).toBeVisible();
        await expect(page.getByTestId('parts-bin')).toBeVisible();
        await expect(page.getByTestId('canvas-container')).toBeVisible();

        const mode = await stores.getModeState();
        expect(mode.primaryMode).toBe('edit');
        expect(await stores.getEdgeCount()).toBe(0);
    });

    test('placing track pieces grows the layout', async ({ stores, app }) => {
        void app;
        for (let i = 0; i < 4; i++) {
            const id = await stores.addTrack(STRAIGHT, { x: 250 + i * 70, y: 320 }, 0);
            expect(id).toBeTruthy();
        }
        await stores.waitForEdgeCount(4);

        const after = await stores.getTrackState();
        expect(Object.keys(after.edges)).toHaveLength(4);
        // Every edge has two endpoints; an unconnected run of 4 has 8 nodes.
        expect(Object.keys(after.nodes)).toHaveLength(8);
    });

    test('layout survives a page reload (persistence)', async ({ page, app, stores }) => {
        void app;
        await stores.addTrack(STRAIGHT, { x: 300, y: 300 }, 0);
        await stores.addTrack(STRAIGHT, { x: 370, y: 300 }, 0);
        await stores.waitForEdgeCount(2);

        // Reload WITHOUT clearing localStorage — the persist middleware should
        // restore the track graph. (?e2e is preserved across reload.)
        await page.reload();
        await stores.waitForBridge();

        expect(await stores.getEdgeCount()).toBe(2);
    });
});

test.describe('User journey: simulating trains', () => {
    test('loading the oval template runs a train around the circuit', async ({ page, app, stores, snap }) => {
        void app;
        // A user picks a ready-made layout from the template dropdown.
        await page.selectOption('[data-testid="file-template-selector"]', 'simple-oval');
        await stores.waitForEdgeCount(8, 10000);

        // The template spawns a train and auto-starts the simulation.
        await stores.waitForTrainCount(1, 5000);
        await page.waitForFunction(
            () => window.__PANIC_STORES__!.simulation.getState().isRunning === true,
            { timeout: 5000 },
        );

        // Speed the train up so the test is fast and robust on slow CI runners.
        await stores.setSpeedMultiplier(3);

        // Wait until the train has driven across several edge boundaries —
        // proof it is genuinely traversing the loop. Polling the event log is
        // deterministic; no fixed sleeps.
        await page.waitForFunction(
            () => window.__PANIC_STORES__!.simulation.getState()
                .simLog.filter((e: { type: string }) => e.type === 'traverse').length >= 4,
            { timeout: 20000 },
        );
        await snap('oval-running');

        const sim = await stores.getSimulationState();
        const trains = Object.values(sim.trains);
        expect(trains).toHaveLength(1);
        // A healthy train on a closed loop never crashes.
        expect(trains.every((t) => !t.crashed)).toBe(true);
        expect(sim.simElapsed).toBeGreaterThan(0);
    });

    test('the user can pause and resume the simulation', async ({ page, app, stores }) => {
        void app;
        await page.selectOption('[data-testid="file-template-selector"]', 'simple-oval');
        await stores.waitForEdgeCount(8, 8000);
        await page.waitForFunction(
            () => window.__PANIC_STORES__!.simulation.getState().isRunning === true,
            { timeout: 5000 },
        );

        // Pause.
        await stores.setRunning(false);
        const paused = await stores.getSimulationState();
        const frozenTrain = Object.values(paused.trains)[0];
        expect(paused.isRunning).toBe(false);

        // While paused, the train must not move.
        await page.waitForTimeout(400);
        const stillPaused = await stores.getSimulationState();
        expect(Object.values(stillPaused.trains)[0].distanceAlongEdge)
            .toBeCloseTo(frozenTrain.distanceAlongEdge, 5);

        // Resume — motion continues.
        await stores.setRunning(true);
        await page.waitForFunction(
            (d) => {
                const t = Object.values(window.__PANIC_STORES__!.simulation.getState().trains)[0] as
                    { distanceAlongEdge: number; currentEdgeId: string } | undefined;
                return !!t && (t.distanceAlongEdge !== d);
            },
            frozenTrain.distanceAlongEdge,
            { timeout: 5000 },
        );
    });
});

test.describe('User journey: navigation', () => {
    test('switching modes swaps the sidebar', async ({ page, app, stores }) => {
        void app;
        await expect(page.getByTestId('parts-bin')).toBeVisible();

        await page.getByTestId('mode-simulate-btn').click();
        await expect(page.getByTestId('train-panel')).toBeVisible();
        expect((await stores.getModeState()).primaryMode).toBe('simulate');

        await page.getByTestId('mode-edit-btn').click();
        await expect(page.getByTestId('parts-bin')).toBeVisible();
        expect((await stores.getModeState()).primaryMode).toBe('edit');
    });

    test('a full build-and-simulate journey produces no console errors', async ({ page, app, stores }) => {
        void app;
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push(err.message));

        await page.selectOption('[data-testid="file-template-selector"]', 'simple-oval');
        await stores.waitForEdgeCount(8, 10000);
        await page.getByTestId('mode-simulate-btn').click();
        await page.waitForTimeout(1000);
        await page.getByTestId('mode-edit-btn').click();

        expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
    });
});
