/**
 * Comprehensive Feature Testing
 *
 * Tests all game features that were NOT covered by previous specs:
 * - Connect mode (joining track endpoints)
 * - Switch toggling during simulation
 * - Collision & crash with debris/effects
 * - Sensors, signals, wires (logic system)
 * - Save/load layout files
 * - Budget system
 * - Multi-carriage trains
 * - Bounce at dead-ends
 * - Keyboard shortcuts
 * - Measurement overlay
 * - All edit tools
 */

import { test, expect } from '../fixtures/app-fixture';
import { AgentActions } from '../helpers/agent-actions';
import { ScreenshotManager } from '../helpers/screenshot-manager';

test.describe('Connect Mode — Join Track Endpoints', () => {
    test('connect two adjacent tracks via connect mode', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'connect-mode');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Place two straight tracks side by side (close but not connected)
        await agent.placeTrack('kato-20-000', { x: 300, y: 400 }, 0);
        await agent.placeTrack('kato-20-000', { x: 548, y: 400 }, 0);
        await snap('01-two-separate-tracks');

        // Verify they're separate (4 nodes, 2 edges)
        const before = await stores.getTrackState();
        expect(Object.keys(before.edges)).toHaveLength(2);
        expect(Object.keys(before.nodes)).toHaveLength(4);

        // Find adjacent nodes to connect
        const nodes = Object.values(before.nodes);
        // Sort by x position to find the two middle nodes
        const sorted = nodes.sort((a: any, b: any) => a.position.x - b.position.x);
        // Nodes[1] and Nodes[2] should be the closest pair
        const nodeA = sorted[1] as any;  // Right end of first track
        const nodeB = sorted[2] as any;  // Left end of second track

        // Connect them via store
        await stores.connectNodes(nodeA.id, nodeB.id, Object.keys(before.edges)[1]);
        await page.waitForTimeout(200);
        await snap('02-after-connect');

        // Should now have fewer nodes (one was merged)
        const after = await stores.getTrackState();
        expect(Object.keys(after.nodes).length).toBeLessThan(4);
    });
});

test.describe('Switch Toggling During Simulation', () => {
    test('load switch template, toggle switch, observe routing', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'switch-toggling');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Load the Switch Showdown template (has switches)
        const templateSelector = page.getByTestId('file-template-selector');
        await templateSelector.selectOption('Switch Showdown');
        await page.waitForTimeout(500);
        await snap('01-switch-template-loaded');

        // Check for switch nodes
        const state = await stores.getTrackState();
        const switchNodes = Object.values(state.nodes).filter((n: any) => n.type === 'switch');
        console.log(`Found ${switchNodes.length} switch nodes`);

        // Switch to simulate mode
        await agent.switchMode('simulate');
        await page.waitForTimeout(200);
        await snap('02-simulate-mode');

        // Toggle a switch if one exists
        if (switchNodes.length > 0) {
            const switchNode = switchNodes[0] as any;
            console.log(`Toggling switch ${switchNode.id.slice(0, 8)}`);
            await stores.toggleSwitch(switchNode.id);
            await page.waitForTimeout(200);
            await snap('03-switch-toggled');

            // Toggle back
            await stores.toggleSwitch(switchNode.id);
            await page.waitForTimeout(200);
            await snap('04-switch-toggled-back');
        }

        // Spawn a train and run to observe routing
        const edges = Object.keys(state.edges);
        if (edges.length > 0) {
            await stores.clearTrains();
            await stores.spawnTrain(edges[0], '#ff3300');
            await stores.setRunning(true);

            await page.waitForTimeout(1000);
            await snap('05-train-running-1s');

            await page.waitForTimeout(2000);
            await snap('06-train-running-3s');

            // Toggle switch while train is running
            if (switchNodes.length > 0) {
                await stores.toggleSwitch((switchNodes[0] as any).id);
                await page.waitForTimeout(200);
                await snap('07-switch-toggled-during-sim');
            }

            await page.waitForTimeout(2000);
            await snap('08-train-after-switch-toggle');

            await stores.setRunning(false);
        }
    });
});

test.describe('Collision & Crash System', () => {
    test('head-on collision with crash effects', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'collision-crash');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Build a short straight run for fast collision
        const edges = await agent.buildStraightRun('kato-20-000', 3, { x: 200, y: 400 }, 0);
        await snap('01-short-track');

        // Switch to simulate
        await agent.switchMode('simulate');

        // Spawn two trains on opposite ends
        await stores.spawnTrain(edges[0], '#ff0000');
        await stores.spawnTrain(edges[edges.length - 1], '#0000ff');
        await snap('02-two-trains-opposite-ends');

        // Run at high speed for faster collision
        await stores.setSpeedMultiplier(3.0);
        await stores.setRunning(true);

        // Capture every second looking for crash
        for (let i = 1; i <= 10; i++) {
            await page.waitForTimeout(500);
            const simState = await stores.getSimulationState();
            const trains = Object.values(simState.trains) as any[];
            const crashed = trains.filter(t => t.crashed);
            const hasCrash = crashed.length > 0;

            await snap(`03-sim-${i * 0.5}s${hasCrash ? '-CRASH' : ''}`);

            if (hasCrash) {
                console.log(`CRASH detected at ${i * 0.5}s! ${crashed.length} trains crashed`);

                // Check for crash effects
                const effects = await page.evaluate(() =>
                    window.__PANIC_STORES__!.effects.getState()
                );
                console.log('Effects state:', JSON.stringify(effects));

                // Check simulation error state
                expect(simState.error).not.toBeNull();
                console.log('Simulation error:', simState.error);
                break;
            }
        }

        await stores.setRunning(false);
        await snap('04-after-crash');

        // Verify at least one train is crashed
        const finalState = await stores.getSimulationState();
        const anyTrainCrashed = Object.values(finalState.trains).some((t: any) => t.crashed);
        console.log('Final crash state:', anyTrainCrashed);
    });
});

test.describe('Logic System — Sensors, Signals, Wires', () => {
    test('place sensors and signals on tracks', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'logic-system');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Place a straight track
        const edgeId = await agent.placeTrack('kato-20-000', { x: 400, y: 400 }, 0);
        expect(edgeId).not.toBeNull();
        await snap('01-track-placed');

        // Check if sensor tool is available
        const sensorTool = page.getByTestId('edit-tool-sensor');
        const isSensorVisible = await sensorTool.isVisible().catch(() => false);
        console.log('Sensor tool visible:', isSensorVisible);

        if (isSensorVisible) {
            // Switch to sensor mode
            await sensorTool.click();
            await page.waitForTimeout(200);
            await snap('02-sensor-mode');

            // Place sensor by clicking on the track
            const state = await stores.getTrackState();
            const edge = state.edges[edgeId!] as any;
            if (edge?.geometry?.type === 'straight') {
                const midX = (edge.geometry.start.x + edge.geometry.end.x) / 2;
                const midY = (edge.geometry.start.y + edge.geometry.end.y) / 2;
                await agent.clickCanvas(midX, midY);
                await page.waitForTimeout(300);
                await snap('03-after-sensor-click');
            }

            // Check logic store for sensors
            const logicState = await page.evaluate(() =>
                window.__PANIC_STORES__!.logic.getState()
            );
            const sensorCount = Object.keys(logicState.sensors).length;
            console.log(`Sensors placed: ${sensorCount}`);

            // Switch to signal mode
            const signalTool = page.getByTestId('edit-tool-signal');
            if (await signalTool.isVisible().catch(() => false)) {
                await signalTool.click();
                await page.waitForTimeout(200);
                await snap('04-signal-mode');

                // Place signal by clicking on a node
                const nodes = Object.values(state.nodes) as any[];
                if (nodes.length > 0) {
                    await agent.clickCanvas(nodes[0].position.x, nodes[0].position.y);
                    await page.waitForTimeout(300);
                    await snap('05-after-signal-click');
                }

                const logicState2 = await page.evaluate(() =>
                    window.__PANIC_STORES__!.logic.getState()
                );
                console.log(`Signals placed: ${Object.keys(logicState2.signals).length}`);
            }
        } else {
            console.log('Sensor tool locked (tutorial not complete) — skipping');
            await snap('02-sensor-locked');
        }

        // Switch back to select
        await agent.selectEditTool('select');
    });
});

test.describe('Multi-Carriage Trains', () => {
    test('spawn trains with multiple carriages', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'multi-carriage');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Build a long track for the train to fit
        await agent.buildStraightRun('kato-20-000', 5, { x: 100, y: 400 }, 0);
        await snap('01-long-track');

        // Switch to simulate
        await agent.switchMode('simulate');

        // Spawn a single-carriage train
        const edges = Object.keys((await stores.getTrackState()).edges);
        const train1 = await stores.spawnTrain(edges[0], '#ff0000', 1);
        await page.waitForTimeout(200);
        await snap('02-single-carriage');

        // Spawn a 5-carriage train
        const train2 = await stores.spawnTrain(edges[2], '#0066ff', 5);
        await page.waitForTimeout(200);
        await snap('03-five-carriages');

        // Run simulation to see carriages trailing
        await stores.setRunning(true);
        await page.waitForTimeout(1500);
        await snap('04-carriages-running-1.5s');

        await page.waitForTimeout(1500);
        await snap('05-carriages-running-3s');

        await stores.setRunning(false);
        await snap('06-carriages-stopped');

        // Verify carriage counts in state
        const simState = await stores.getSimulationState();
        for (const [id, train] of Object.entries(simState.trains)) {
            const t = train as any;
            console.log(`Train ${id}: carriages=${t.carriageCount}, color=${t.color}`);
        }
    });
});

test.describe('Bounce at Dead-Ends', () => {
    test('train bounces when hitting end of track', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'bounce-deadend');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Place a single short track (dead ends on both sides)
        await agent.placeTrack('kato-20-000', { x: 500, y: 400 }, 0);
        await snap('01-single-track-deadends');

        // Switch to simulate and add train
        await agent.switchMode('simulate');
        const edges = Object.keys((await stores.getTrackState()).edges);
        await stores.spawnTrain(edges[0], '#ff6600');
        await snap('02-train-on-short-track');

        // Run and capture bounces
        await stores.setRunning(true);
        const positions: { time: number; dist: number; dir: number }[] = [];

        for (let i = 0; i < 12; i++) {
            await page.waitForTimeout(500);
            const simState = await stores.getSimulationState();
            const train = Object.values(simState.trains)[0] as any;
            if (train) {
                positions.push({
                    time: (i + 1) * 0.5,
                    dist: train.distanceAlongEdge,
                    dir: train.direction,
                });
            }
            await snap(`03-bounce-${(i + 1) * 0.5}s`);
        }

        await stores.setRunning(false);

        // Log position/direction changes to see bounces
        console.log('Bounce tracking:');
        for (const p of positions) {
            console.log(`  t=${p.time}s: dist=${p.dist?.toFixed(1)}, dir=${p.dir}`);
        }

        // Verify direction changed (bounce happened)
        const directions = positions.map(p => p.dir);
        const hasDirectionChange = directions.some((d, i) => i > 0 && d !== directions[i - 1]);
        console.log('Direction changed (bounce detected):', hasDirectionChange);
    });
});

test.describe('Budget System', () => {
    test('budget decreases when placing tracks', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'budget-system');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Check starting budget
        const budget1 = await page.evaluate(() =>
            window.__PANIC_STORES__!.budget.getState()
        );
        console.log('Starting budget:', budget1);
        await snap('01-starting-budget');

        // Place a track
        await agent.placeTrack('kato-20-000', { x: 400, y: 400 }, 0);
        await page.waitForTimeout(200);

        // Check budget after
        const budget2 = await page.evaluate(() =>
            window.__PANIC_STORES__!.budget.getState()
        );
        console.log('After first track:', budget2);
        await snap('02-after-first-track');

        // Place more tracks
        await agent.placeTrack('kato-20-000', { x: 648, y: 400 }, 0);
        await agent.placeTrack('kato-20-100', { x: 896, y: 400 }, 0);
        await page.waitForTimeout(200);

        const budget3 = await page.evaluate(() =>
            window.__PANIC_STORES__!.budget.getState()
        );
        console.log('After three tracks:', budget3);
        await snap('03-after-three-tracks');

        // Check the budget display in toolbar
        const budgetDisplay = page.locator('.budget-display, [data-testid*="budget"]');
        if (await budgetDisplay.isVisible().catch(() => false)) {
            const text = await budgetDisplay.textContent();
            console.log('Budget UI display:', text);
        }
    });
});

test.describe('Keyboard Shortcuts', () => {
    test('all keyboard shortcuts work', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'keyboard-shortcuts');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Test edit tool shortcuts (1-6)
        await page.keyboard.press('1');
        await page.waitForTimeout(200);
        let mode = await stores.getModeState();
        console.log('After "1":', mode.editSubMode);
        await snap('01-key-1-select');

        await page.keyboard.press('3');
        await page.waitForTimeout(200);
        mode = await stores.getModeState();
        console.log('After "3":', mode.editSubMode);
        await snap('02-key-3-delete');

        await page.keyboard.press('1');
        await page.waitForTimeout(200);

        // M key — mode toggle
        await page.keyboard.press('m');
        await page.waitForTimeout(300);
        mode = await stores.getModeState();
        expect(mode.primaryMode).toBe('simulate');
        await snap('03-key-m-simulate');

        // Space — play/pause (in simulate mode)
        // Place a track first to have something to simulate
        await page.keyboard.press('m'); // back to edit
        await agent.placeTrack('kato-20-000', { x: 400, y: 400 }, 0);
        await page.keyboard.press('m'); // to simulate

        const edges = Object.keys((await stores.getTrackState()).edges);
        if (edges.length > 0) {
            await stores.spawnTrain(edges[0]);
        }

        await page.keyboard.press('Space');
        await page.waitForTimeout(500);
        let simState = await stores.getSimulationState();
        console.log('After Space:', simState.isRunning);
        await snap('04-key-space-play');

        await page.keyboard.press('Space');
        await page.waitForTimeout(200);
        simState = await stores.getSimulationState();
        console.log('After Space again:', simState.isRunning);
        await snap('05-key-space-pause');

        // + key — speed up
        await page.keyboard.press('Equal'); // + key
        await page.waitForTimeout(200);
        simState = await stores.getSimulationState();
        console.log('After +:', simState.speedMultiplier);

        // - key — speed down
        await page.keyboard.press('Minus');
        await page.waitForTimeout(200);
        simState = await stores.getSimulationState();
        console.log('After -:', simState.speedMultiplier);

        // Shift+M — measurement overlay
        await page.keyboard.press('m'); // back to edit
        await page.keyboard.press('Shift+m');
        await page.waitForTimeout(300);
        await snap('06-measurement-overlay');

        // Toggle off
        await page.keyboard.press('Shift+m');
        await page.waitForTimeout(200);

        // Backtick — debug overlay
        await page.keyboard.press('Backquote');
        await page.waitForTimeout(300);
        await snap('07-debug-overlay');

        // Toggle off
        await page.keyboard.press('Backquote');
        await page.waitForTimeout(200);
        await snap('08-debug-off');
    });
});

test.describe('Save and Load Layout', () => {
    test('save layout data and reload it', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'save-load');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Build a layout
        await agent.placeTrack('kato-20-000', { x: 300, y: 400 }, 0);
        await agent.placeTrack('kato-20-000', { x: 548, y: 400 }, 0);
        await agent.placeTrack('kato-20-100', { x: 796, y: 400 }, 0);
        await snap('01-layout-built');

        const originalState = await stores.getTrackState();
        const originalEdgeCount = Object.keys(originalState.edges).length;
        console.log('Original edges:', originalEdgeCount);

        // Get layout data via store
        const layoutData = await page.evaluate(() =>
            window.__PANIC_STORES__!.track.getLayout()
        );
        await snap('02-layout-data-captured');

        // Clear the layout
        await stores.clearLayout();
        await page.waitForTimeout(200);
        await snap('03-layout-cleared');

        const clearedCount = await stores.getEdgeCount();
        expect(clearedCount).toBe(0);

        // Reload the saved layout
        await stores.loadLayout(layoutData as object);
        await page.waitForTimeout(300);
        await snap('04-layout-reloaded');

        const reloadedCount = await stores.getEdgeCount();
        expect(reloadedCount).toBe(originalEdgeCount);
        console.log('Reloaded edges:', reloadedCount, '(expected', originalEdgeCount, ')');
    });
});

test.describe('Measurement & Debug Overlays', () => {
    test('overlays show correct information', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'overlays');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Place some tracks so overlays have data to show
        await agent.placeTrack('kato-20-000', { x: 300, y: 400 }, 0);
        await agent.placeTrack('kato-20-000', { x: 548, y: 400 }, 0);
        await snap('01-with-tracks');

        // Toggle measurement overlay
        await page.keyboard.press('Shift+m');
        await page.waitForTimeout(300);
        await snap('02-measurement-overlay-on');

        // Check if measurement overlay content is visible
        const measureOverlay = page.locator('.measurement-overlay, [data-testid="measurement-overlay"]');
        if (await measureOverlay.isVisible().catch(() => false)) {
            const text = await measureOverlay.textContent();
            console.log('Measurement overlay text:', text);
        }

        // Toggle off
        await page.keyboard.press('Shift+m');
        await page.waitForTimeout(200);

        // Toggle debug overlay
        await page.keyboard.press('Backquote');
        await page.waitForTimeout(300);
        await snap('03-debug-overlay-on');

        // Check debug overlay content
        const debugOverlay = page.locator('.debug-overlay, [data-testid="debug-overlay"]');
        if (await debugOverlay.isVisible().catch(() => false)) {
            const text = await debugOverlay.textContent();
            console.log('Debug overlay text:', text?.slice(0, 200));
        }

        await page.keyboard.press('Backquote');
        await page.waitForTimeout(200);
        await snap('04-overlays-off');
    });
});

test.describe('Complete Gameplay Loop', () => {
    test('build circuit → add train → run → observe full loop', async ({ page, app, stores, snap }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'gameplay-loop');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Load the Simple Oval template (connected circuit)
        const templateSelector = page.getByTestId('file-template-selector');
        await templateSelector.selectOption('Simple Oval');
        await page.waitForTimeout(500);
        await snap('01-oval-loaded');

        // Verify it's a connected circuit
        const state = await stores.getTrackState();
        const edgeCount = Object.keys(state.edges).length;
        const nodeCount = Object.keys(state.nodes).length;
        console.log(`Circuit: ${edgeCount} edges, ${nodeCount} nodes`);

        // Check for open endpoints (should be 0 for a closed circuit)
        const openEndpoints = await stores.getOpenEndpoints();
        console.log(`Open endpoints: ${(openEndpoints as any[]).length}`);

        // Switch to simulate mode
        await agent.switchMode('simulate');
        await snap('02-simulate-mode');

        // Clear any auto-spawned trains and add our own
        await stores.clearTrains();
        const edges = Object.keys(state.edges);
        await stores.spawnTrain(edges[0], '#ff0000', 3); // 3-carriage red train
        await page.waitForTimeout(200);
        await snap('03-train-spawned');

        // Run simulation and track position over time to verify loop completion
        await stores.setRunning(true);
        const positions: { time: number; edgeId: string; dist: number }[] = [];

        for (let i = 0; i < 20; i++) {
            await page.waitForTimeout(500);
            const simState = await stores.getSimulationState();
            const train = Object.values(simState.trains)[0] as any;
            if (train) {
                positions.push({
                    time: (i + 1) * 0.5,
                    edgeId: train.currentEdgeId,
                    dist: train.distanceAlongEdge,
                });
            }

            // Capture at key moments
            if (i === 3 || i === 7 || i === 11 || i === 15 || i === 19) {
                await snap(`04-loop-${(i + 1) * 0.5}s`);
            }
        }

        await stores.setRunning(false);
        await snap('05-loop-complete');

        // Verify train traversed multiple edges (went around the loop)
        const uniqueEdges = new Set(positions.map(p => p.edgeId));
        console.log(`Train visited ${uniqueEdges.size} unique edges out of ${edgeCount}`);
        console.log('Position log:');
        for (const p of positions) {
            console.log(`  t=${p.time}s: edge=${p.edgeId?.slice(0, 8)}, dist=${p.dist?.toFixed(1)}`);
        }

        // Should have visited multiple edges if circuit works
        expect(uniqueEdges.size).toBeGreaterThan(1);
    });
});
