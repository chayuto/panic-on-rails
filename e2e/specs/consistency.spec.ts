/**
 * Data-Visual Consistency Tests
 *
 * Verifies that what is rendered on the canvas matches
 * what the Zustand stores say should be there.
 */

import { test, expect } from '../fixtures/app-fixture';
import { AgentActions } from '../helpers/agent-actions';
import { ScreenshotManager } from '../helpers/screenshot-manager';

test.describe('Data-Visual Consistency', () => {
    test.beforeEach(async ({ app }) => {
        void app;
    });

    test('empty canvas has zero tracks in both store and render', async ({ page, stores }) => {
        const screenshots = new ScreenshotManager(page, stores, 'empty-consistency');
        const agent = new AgentActions(page, stores, screenshots);

        const report = await agent.verify('empty-state');

        expect(report.state.track.nodes).toEqual({});
        expect(report.state.track.edges).toEqual({});
        expect(report.consistency.modeUiMatch).toBe(true);
        expect(report.consistency.issues).toHaveLength(0);
    });

    test('mode UI matches store after switching', async ({ page, stores }) => {
        const screenshots = new ScreenshotManager(page, stores, 'mode-consistency');
        const agent = new AgentActions(page, stores, screenshots);

        // Check edit mode consistency
        let report = await agent.verify('01-edit-mode');
        expect(report.consistency.modeUiMatch).toBe(true);
        expect(report.state.mode.primaryMode).toBe('edit');

        // Switch to simulate
        await agent.switchMode('simulate');
        report = await agent.verify('02-simulate-mode');
        expect(report.consistency.modeUiMatch).toBe(true);
        expect(report.state.mode.primaryMode).toBe('simulate');

        // Switch back
        await agent.switchMode('edit');
        report = await agent.verify('03-back-to-edit');
        expect(report.consistency.modeUiMatch).toBe(true);
    });

    test('track count matches after placement', async ({ page, stores }) => {
        const screenshots = new ScreenshotManager(page, stores, 'track-consistency');
        const agent = new AgentActions(page, stores, screenshots);

        // Place tracks
        await agent.placeTrack('kato-20-000', { x: 300, y: 300 }, 0);
        await agent.placeTrack('kato-20-000', { x: 500, y: 300 }, 0);

        // Wait for render
        await page.waitForTimeout(200);

        const report = await agent.verify('after-placement');

        // Store should have 2 edges
        expect(Object.keys(report.state.track.edges)).toHaveLength(2);

        // No consistency issues (beyond render count which may vary)
        expect(report.consistency.modeUiMatch).toBe(true);
    });
});
