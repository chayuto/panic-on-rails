/**
 * Full User Session Simulation
 *
 * Simulates a real user playing PanicOnRails end-to-end:
 * 1. Explore the UI (toolbar, parts bin, system tabs)
 * 2. Place tracks to build a layout
 * 3. Connect tracks together
 * 4. Switch to simulate mode
 * 5. Add trains and run the simulation
 * 6. Observe collisions and crashes
 * 7. Save and load layouts
 */

import { test, expect } from '../fixtures/app-fixture';
import { AgentActions } from '../helpers/agent-actions';
import { ScreenshotManager } from '../helpers/screenshot-manager';
import { StoreBridge } from '../helpers/store-bridge';

test.describe('Full User Session', () => {

    test('complete gameplay: build layout, run trains, observe simulation', async ({ page, app, stores }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'full-user-session');
        const agent = new AgentActions(page, stores, screenshots);

        // ==========================================
        // PHASE 1: First Launch — Explore the UI
        // ==========================================

        await screenshots.capture('01-app-launch');

        // Verify we start in Edit mode
        const modeState = await stores.getModeState();
        expect(modeState.primaryMode).toBe('edit');
        expect(modeState.editSubMode).toBe('select');

        // Check the parts bin is showing N-Scale parts
        const editorState = await stores.getEditorState();
        expect(editorState.selectedSystem).toBe('n-scale');

        // Dismiss the onboarding tutorial if visible
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }
        await screenshots.capture('02-tutorial-dismissed');

        // ==========================================
        // PHASE 2: Explore Parts Bin
        // ==========================================

        // Check N-Scale tab is active
        const partsBin = page.getByTestId('parts-bin');
        await expect(partsBin).toBeVisible();
        await screenshots.capture('03-parts-bin-n-scale');

        // Switch to Wooden system tab
        await agent.selectSystem('wooden');
        await page.waitForTimeout(200);
        await screenshots.capture('04-parts-bin-wooden');

        // Switch back to N-Scale
        await agent.selectSystem('n-scale');
        await page.waitForTimeout(200);

        // ==========================================
        // PHASE 3: Build a Track Layout
        // ==========================================

        // Place first straight track in the center
        const edge1 = await agent.placeTrack('kato-20-000', { x: 400, y: 300 }, 0);
        expect(edge1).not.toBeNull();
        await screenshots.capture('05-first-straight');

        // Place second straight adjacent (extending right)
        const edge2 = await agent.placeTrack('kato-20-000', { x: 648, y: 300 }, 0);
        expect(edge2).not.toBeNull();
        await screenshots.capture('06-two-straights');

        // Place third straight extending further right
        const edge3 = await agent.placeTrack('kato-20-000', { x: 896, y: 300 }, 0);
        expect(edge3).not.toBeNull();
        await screenshots.capture('07-three-straights');

        // Verify track state
        await agent.assertTrackState({ edgeCount: 3 });

        // Place a curve at the end (turning downward)
        const curve1 = await agent.placeTrack('kato-20-100', { x: 1100, y: 300 }, 0);
        expect(curve1).not.toBeNull();
        await screenshots.capture('08-first-curve');

        // Place more curves to form a U-turn
        const curve2 = await agent.placeTrack('kato-20-100', { x: 1200, y: 400 }, 45);
        const curve3 = await agent.placeTrack('kato-20-100', { x: 1200, y: 550 }, 90);
        const curve4 = await agent.placeTrack('kato-20-100', { x: 1100, y: 650 }, 135);
        await screenshots.capture('09-u-turn-curves');

        // Place straights going back left
        const edge4 = await agent.placeTrack('kato-20-000', { x: 850, y: 700 }, 180);
        const edge5 = await agent.placeTrack('kato-20-000', { x: 600, y: 700 }, 180);
        const edge6 = await agent.placeTrack('kato-20-000', { x: 350, y: 700 }, 180);
        await screenshots.capture('10-bottom-straights');

        // Place curves to complete the oval
        const curve5 = await agent.placeTrack('kato-20-100', { x: 200, y: 650 }, 180);
        const curve6 = await agent.placeTrack('kato-20-100', { x: 100, y: 550 }, 225);
        const curve7 = await agent.placeTrack('kato-20-100', { x: 100, y: 400 }, 270);
        const curve8 = await agent.placeTrack('kato-20-100', { x: 200, y: 300 }, 315);
        await screenshots.capture('11-oval-complete-disconnected');

        // Check how many tracks we've placed
        const trackState = await stores.getTrackState();
        const totalEdges = Object.keys(trackState.edges).length;
        console.log(`Total edges placed: ${totalEdges}`);

        // ==========================================
        // PHASE 4: Try Different Edit Tools
        // ==========================================

        // Switch to select tool
        await agent.selectEditTool('select');
        await screenshots.capture('12-select-tool');

        // Switch to delete tool
        await agent.selectEditTool('delete');
        await screenshots.capture('13-delete-tool');

        // Switch back to select
        await agent.selectEditTool('select');

        // ==========================================
        // PHASE 5: Build from Template Instead
        // ==========================================

        // Clear current layout
        await stores.clearLayout();
        await page.waitForTimeout(200);
        await screenshots.capture('14-cleared-layout');

        // Load the simple oval template
        const templateSelector = page.getByTestId('file-template-selector');
        const options = await templateSelector.locator('option').allTextContents();
        console.log('Available templates:', options);

        // Try loading first non-empty template
        if (options.length > 1) {
            await templateSelector.selectOption({ index: 1 });
            await page.waitForTimeout(500);
            await screenshots.capture('15-template-loaded');

            const afterTemplate = await stores.getTrackState();
            const templateEdges = Object.keys(afterTemplate.edges).length;
            const templateNodes = Object.keys(afterTemplate.nodes).length;
            console.log(`Template loaded: ${templateEdges} edges, ${templateNodes} nodes`);
        }

        // ==========================================
        // PHASE 6: Switch to Simulate Mode
        // ==========================================

        await agent.switchMode('simulate');
        await page.waitForTimeout(300);
        await screenshots.capture('16-simulate-mode');

        // Verify mode changed
        const simMode = await stores.getModeState();
        expect(simMode.primaryMode).toBe('simulate');

        // Train panel should be visible
        await expect(page.getByTestId('train-panel')).toBeVisible();
        await expect(page.getByTestId('parts-bin')).not.toBeVisible();

        // ==========================================
        // PHASE 7: Add Trains
        // ==========================================

        // Get current edges to find one to place a train on
        const currentState = await stores.getTrackState();
        const edgeIds = Object.keys(currentState.edges);

        if (edgeIds.length > 0) {
            // Clear any existing trains first
            await stores.clearTrains();

            // Spawn first train (red by default)
            const train1 = await stores.spawnTrain(edgeIds[0]);
            await page.waitForTimeout(200);
            await screenshots.capture('17-first-train-spawned');

            // Check simulation state
            const simState1 = await stores.getSimulationState();
            expect(Object.keys(simState1.trains)).toHaveLength(1);
            console.log('Train 1 spawned:', train1);

            // Spawn second train on a different edge
            if (edgeIds.length > 2) {
                const train2 = await stores.spawnTrain(edgeIds[Math.floor(edgeIds.length / 2)], '#0088ff');
                await page.waitForTimeout(200);
                await screenshots.capture('18-second-train-spawned');
                console.log('Train 2 spawned:', train2);
            }

            // ==========================================
            // PHASE 8: Run the Simulation
            // ==========================================

            // Start the simulation
            await stores.setRunning(true);
            await page.waitForTimeout(500);
            await screenshots.capture('19-simulation-running-0.5s');

            // Let it run for a bit and capture at intervals
            await page.waitForTimeout(1000);
            await screenshots.capture('20-simulation-running-1.5s');

            await page.waitForTimeout(1000);
            await screenshots.capture('21-simulation-running-2.5s');

            await page.waitForTimeout(1000);
            await screenshots.capture('22-simulation-running-3.5s');

            // Check train positions have changed
            const simState2 = await stores.getSimulationState();
            for (const [id, train] of Object.entries(simState2.trains)) {
                const t = train as any;
                console.log(`Train ${id.slice(0, 8)}: edge=${t.currentEdgeId?.slice(0, 8)}, dist=${t.distanceAlongEdge?.toFixed(1)}, speed=${t.speed}, crashed=${t.crashed}`);
            }

            await page.waitForTimeout(1500);
            await screenshots.capture('23-simulation-running-5s');

            // ==========================================
            // PHASE 9: Speed Control
            // ==========================================

            // Speed up the simulation
            await stores.setSpeedMultiplier(3.0);
            await page.waitForTimeout(1000);
            await screenshots.capture('24-simulation-3x-speed');

            // Slow it back down
            await stores.setSpeedMultiplier(1.0);

            // ==========================================
            // PHASE 10: Stop and Review
            // ==========================================

            // Pause the simulation
            await stores.setRunning(false);
            await page.waitForTimeout(200);
            await screenshots.capture('25-simulation-paused');

            // Check final state
            const finalSimState = await stores.getSimulationState();
            expect(finalSimState.isRunning).toBe(false);
            console.log('Final simulation state:', {
                trainCount: Object.keys(finalSimState.trains).length,
                isRunning: finalSimState.isRunning,
                error: finalSimState.error,
            });
        }

        // ==========================================
        // PHASE 11: Switch Back to Edit Mode
        // ==========================================

        await agent.switchMode('edit');
        await page.waitForTimeout(300);
        await screenshots.capture('26-back-to-edit');

        // Verify edit mode
        const editMode = await stores.getModeState();
        expect(editMode.primaryMode).toBe('edit');

        // ==========================================
        // PHASE 12: Try UI Buttons
        // ==========================================

        // Toggle grid
        await page.getByTestId('view-grid-toggle').click();
        await page.waitForTimeout(200);
        await screenshots.capture('27-grid-toggled-off');

        // Toggle grid back on
        await page.getByTestId('view-grid-toggle').click();
        await page.waitForTimeout(200);

        // ==========================================
        // PHASE 13: Delete Some Tracks
        // ==========================================

        // Switch to delete tool
        await agent.selectEditTool('delete');
        await screenshots.capture('28-delete-mode');

        // Delete a track by clicking on it
        const stateBeforeDelete = await stores.getTrackState();
        const edgesToDelete = Object.keys(stateBeforeDelete.edges);
        if (edgesToDelete.length > 0) {
            // Remove a track programmatically
            await stores.removeTrack(edgesToDelete[0]);
            await page.waitForTimeout(200);
            await screenshots.capture('29-after-delete');

            const stateAfterDelete = await stores.getTrackState();
            expect(Object.keys(stateAfterDelete.edges).length).toBe(edgesToDelete.length - 1);
        }

        // Switch back to select
        await agent.selectEditTool('select');

        // ==========================================
        // PHASE 14: Save Layout
        // ==========================================

        // Get the layout data for verification
        const layoutData = await page.evaluate(() =>
            window.__PANIC_STORES__!.track.getLayout()
        );
        console.log('Layout data version:', (layoutData as any)?.version);

        await screenshots.capture('30-final-state');

        // ==========================================
        // PHASE 15: Test Keyboard Shortcuts
        // ==========================================

        // 'M' key toggles mode
        await page.keyboard.press('m');
        await page.waitForTimeout(300);
        await screenshots.capture('31-mode-after-m-key');

        const afterM = await stores.getModeState();
        expect(afterM.primaryMode).toBe('simulate');

        // Press M again to go back
        await page.keyboard.press('m');
        await page.waitForTimeout(300);
        await screenshots.capture('32-mode-after-m-again');

        const afterM2 = await stores.getModeState();
        expect(afterM2.primaryMode).toBe('edit');

        // ==========================================
        // Done!
        // ==========================================

        await screenshots.capture('33-session-complete');
        console.log('Full user session simulation complete!');
    });

    test('collision scenario: two trains on same track', async ({ page, app, stores }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'collision-scenario');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Build a long straight track
        const edges = await agent.buildStraightRun('kato-20-000', 6, { x: 100, y: 400 }, 0);
        expect(edges.length).toBeGreaterThan(0);
        await screenshots.capture('01-long-straight');

        // Switch to simulate
        await agent.switchMode('simulate');
        await page.waitForTimeout(200);

        // Spawn two trains on the same edge (potential collision)
        if (edges.length >= 2) {
            await stores.spawnTrain(edges[0], '#ff0000');
            await stores.spawnTrain(edges[edges.length - 1], '#0000ff');
            await page.waitForTimeout(200);
            await screenshots.capture('02-two-trains-placed');

            // Run simulation and watch for collision
            await stores.setRunning(true);

            for (let i = 0; i < 8; i++) {
                await page.waitForTimeout(1000);
                const simState = await stores.getSimulationState();
                const trains = Object.values(simState.trains) as any[];
                const anyCollision = trains.some(t => t.crashed);

                await screenshots.capture(`03-running-${i + 1}s${anyCollision ? '-COLLISION' : ''}`);

                if (anyCollision) {
                    console.log(`Collision detected at ${i + 1}s!`);
                    break;
                }
            }

            await stores.setRunning(false);
            await screenshots.capture('04-simulation-ended');

            // Check final train states
            const finalState = await stores.getSimulationState();
            for (const [id, train] of Object.entries(finalState.trains)) {
                const t = train as any;
                console.log(`Train ${id.slice(0, 8)}: crashed=${t.crashed}, dist=${t.distanceAlongEdge?.toFixed(1)}`);
            }
        }
    });

    test('template gallery: load each template and screenshot', async ({ page, app, stores }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'template-gallery');

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        await screenshots.capture('01-empty-start');

        // Get all template options
        const templateSelector = page.getByTestId('file-template-selector');
        const options = await templateSelector.locator('option').allTextContents();
        console.log('Templates found:', options);

        // Load each template and take a screenshot
        for (let i = 1; i < options.length; i++) {
            // Clear first
            await stores.clearLayout();
            await page.waitForTimeout(100);

            // Load template
            await templateSelector.selectOption({ index: i });
            await page.waitForTimeout(500);

            const state = await stores.getTrackState();
            const edgeCount = Object.keys(state.edges).length;
            const nodeCount = Object.keys(state.nodes).length;
            const templateName = options[i].replace(/[^a-zA-Z0-9]/g, '-');

            console.log(`Template "${options[i]}": ${edgeCount} edges, ${nodeCount} nodes`);
            await screenshots.capture(`02-template-${templateName}`);
        }
    });

    test('wooden system exploration', async ({ page, app, stores }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'wooden-system');
        const agent = new AgentActions(page, stores, screenshots);

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // Switch to wooden system
        await agent.selectSystem('wooden');
        await page.waitForTimeout(200);
        await screenshots.capture('01-wooden-parts-bin');

        // Check what wooden parts are available
        const editorState = await stores.getEditorState();
        expect(editorState.selectedSystem).toBe('wooden');

        // Place some wooden tracks
        const edge1 = await agent.placeTrack('brio-straight-long', { x: 400, y: 350 }, 0);
        await screenshots.capture('02-wooden-straight');

        if (edge1) {
            // Place a curve
            const edge2 = await agent.placeTrack('brio-curve-short', { x: 700, y: 350 }, 0);
            await screenshots.capture('03-wooden-curve');

            // Check state
            const state = await stores.getTrackState();
            console.log('Wooden tracks placed:', Object.keys(state.edges).length);
        }

        // Switch to simulate and add a train on wooden tracks
        await agent.switchMode('simulate');
        const trackState = await stores.getTrackState();
        const woodenEdges = Object.keys(trackState.edges);

        if (woodenEdges.length > 0) {
            await stores.spawnTrain(woodenEdges[0], '#228B22');
            await page.waitForTimeout(200);
            await screenshots.capture('04-wooden-with-train');

            // Run briefly
            await stores.setRunning(true);
            await page.waitForTimeout(2000);
            await screenshots.capture('05-wooden-simulation');
            await stores.setRunning(false);
        }
    });
});
