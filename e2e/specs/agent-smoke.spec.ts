/**
 * Agent Smoke Tests
 *
 * Verifies the debug bridge, store access, and screenshot capture work.
 * These are the foundation tests — if these fail, nothing else will work.
 */

import { test, expect } from '../fixtures/app-fixture';

test.describe('Agent Infrastructure Smoke Tests', () => {
    test.beforeEach(async ({ app }) => {
        void app;
    });

    test('debug bridge exposes stores', async ({ stores }) => {
        // Track store should have empty state
        const trackState = await stores.getTrackState();
        expect(trackState.nodes).toBeDefined();
        expect(trackState.edges).toBeDefined();
        expect(Object.keys(trackState.edges)).toHaveLength(0);

        // Mode store should start in edit mode
        const modeState = await stores.getModeState();
        expect(modeState.primaryMode).toBe('edit');
        expect(modeState.editSubMode).toBe('select');

        // Simulation should not be running
        const simState = await stores.getSimulationState();
        expect(simState.isRunning).toBe(false);
        expect(Object.keys(simState.trains)).toHaveLength(0);
    });

    test('can read and write track state', async ({ stores }) => {
        // Place a straight track via store bridge
        const edgeId = await stores.addTrack('kato-20-000', { x: 400, y: 300 }, 0);
        expect(edgeId).not.toBeNull();

        // Verify it was created
        const nodeCount = await stores.getNodeCount();
        const edgeCount = await stores.getEdgeCount();
        expect(edgeCount).toBe(1);
        expect(nodeCount).toBe(2);

        // Remove it
        await stores.removeTrack(edgeId!);
        const afterRemove = await stores.getEdgeCount();
        expect(afterRemove).toBe(0);
    });

    test('can switch modes via store bridge', async ({ stores }) => {
        await stores.enterSimulateMode();
        const simMode = await stores.getModeState();
        expect(simMode.primaryMode).toBe('simulate');

        await stores.enterEditMode();
        const editMode = await stores.getModeState();
        expect(editMode.primaryMode).toBe('edit');
    });

    test('screenshot capture saves files', async ({ snap, stores }) => {
        // Place a track so there's something to see
        await stores.addTrack('kato-20-000', { x: 400, y: 300 }, 0);

        // Capture
        const result = await snap('smoke-test');

        // Verify files exist
        const fs = await import('fs');
        expect(fs.existsSync(result.screenshotPath)).toBe(true);
        expect(fs.existsSync(result.statePath)).toBe(true);

        // Verify state was captured
        expect(result.state.track.nodes).toBeDefined();
        expect(Object.keys(result.state.track.edges)).toHaveLength(1);
    });
});
