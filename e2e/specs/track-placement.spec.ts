/**
 * Track Placement Tests
 *
 * Verifies programmatic track placement via the agent API.
 * Places tracks, verifies store state, captures screenshots
 * for visual verification.
 */

import { test, expect } from '../fixtures/app-fixture';
import { AgentActions } from '../helpers/agent-actions';
import { ScreenshotManager } from '../helpers/screenshot-manager';

test.describe('Track Placement via Agent', () => {
    test.beforeEach(async ({ app }) => {
        void app;
    });

    test('place a single straight track', async ({ page, stores, snap }) => {
        const screenshots = new ScreenshotManager(page, stores, 'single-straight');
        const agent = new AgentActions(page, stores, screenshots);

        await snap('01-empty-canvas');

        // Place a straight track
        const edgeId = await agent.placeTrack('kato-20-000', { x: 400, y: 300 }, 0);
        expect(edgeId).not.toBeNull();

        await snap('02-after-placement');

        // Verify store state
        await agent.assertTrackState({ edgeCount: 1, nodeCount: 2 });
    });

    test('place multiple tracks in a row', async ({ page, stores, snap }) => {
        const screenshots = new ScreenshotManager(page, stores, 'straight-run');
        const agent = new AgentActions(page, stores, screenshots);

        // Build a run of 4 straight tracks
        const edgeIds = await agent.buildStraightRun(
            'kato-20-000', 4, { x: 200, y: 300 }, 0,
        );

        expect(edgeIds).toHaveLength(4);

        await snap('01-four-straights');

        // Should have 4 edges and 8 nodes (not connected)
        await agent.assertTrackState({ edgeCount: 4 });
    });

    test('place a curve track', async ({ page, stores, snap }) => {
        const screenshots = new ScreenshotManager(page, stores, 'curve-placement');
        const agent = new AgentActions(page, stores, screenshots);

        const edgeId = await agent.placeTrack('kato-20-100', { x: 400, y: 300 }, 0);
        expect(edgeId).not.toBeNull();

        await snap('01-curve-placed');

        const state = await stores.getTrackState();
        const edge = state.edges[edgeId!];
        expect(edge).toBeDefined();
    });

    test('clear layout removes all tracks', async ({ page, stores, snap }) => {
        const screenshots = new ScreenshotManager(page, stores, 'clear-layout');
        const agent = new AgentActions(page, stores, screenshots);

        // Place some tracks
        await agent.placeTrack('kato-20-000', { x: 300, y: 300 }, 0);
        await agent.placeTrack('kato-20-000', { x: 500, y: 300 }, 0);

        await snap('01-with-tracks');
        await agent.assertTrackState({ edgeCount: 2 });

        // Clear
        await stores.clearLayout();
        await page.waitForTimeout(100);

        await snap('02-after-clear');
        await agent.assertTrackState({ edgeCount: 0, nodeCount: 0 });
    });
});
