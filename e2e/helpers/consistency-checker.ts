/**
 * Consistency Checker — Verify that rendered visuals match store data.
 *
 * Bridges the gap between what Zustand says the state is and what Konva
 * actually rendered on the canvas. Uses the Konva stage ref exposed by
 * the debug bridge (window.__PANIC_STAGE__).
 */

import type { Page } from '@playwright/test';
import { StoreBridge } from './store-bridge';
import type { ConsistencyReport } from './types';

export class ConsistencyChecker {
    constructor(
        private page: Page,
        private stores: StoreBridge,
    ) {}

    /**
     * Count rendered track shapes on the Konva stage.
     * Track edges are rendered as Groups containing Line shapes for rails.
     * We count Groups that actually contain Line children (to exclude
     * empty container Groups from WireLayer, SensorLayer, etc.).
     */
    async getRenderedTrackCount(): Promise<number> {
        return this.page.evaluate(() => {
            const stage = window.__PANIC_STAGE__;
            if (!stage) return -1;

            // Layer index 1 is Track + Logic layer (from StageWrapper)
            const trackLayer = stage.children?.[1];
            if (!trackLayer) return -1;

            // Count Groups that contain Line shapes (actual track renderings).
            // Empty groups or groups with only other shapes are non-track elements.
            let count = 0;
            const children = trackLayer.getChildren();
            for (const child of children) {
                if (child.getClassName() === 'Group') {
                    const lines = (child as any).find?.('Line');
                    if (lines && lines.length > 0) {
                        count++;
                    }
                }
            }
            return count;
        });
    }

    /**
     * Check if the mode UI matches the store state.
     */
    async checkModeConsistency(): Promise<{ storeMode: string; uiMode: string; match: boolean }> {
        const modeState = await this.stores.getModeState();
        const storeMode = modeState.primaryMode;

        // Check which mode button has aria-pressed=true
        const editPressed = await this.page.getByTestId('mode-edit-btn').getAttribute('aria-pressed');
        const simPressed = await this.page.getByTestId('mode-simulate-btn').getAttribute('aria-pressed');

        let uiMode: string;
        if (editPressed === 'true') uiMode = 'edit';
        else if (simPressed === 'true') uiMode = 'simulate';
        else uiMode = 'unknown';

        return {
            storeMode,
            uiMode,
            match: storeMode === uiMode,
        };
    }

    /**
     * Check if the correct sidebar is visible for the current mode.
     */
    async checkSidebarConsistency(): Promise<{ expected: string; visible: string; match: boolean }> {
        const modeState = await this.stores.getModeState();

        const partsBinVisible = await this.page.getByTestId('parts-bin').isVisible().catch(() => false);
        const trainPanelVisible = await this.page.getByTestId('train-panel').isVisible().catch(() => false);

        const expected = modeState.primaryMode === 'edit' ? 'parts-bin' : 'train-panel';
        const visible = partsBinVisible ? 'parts-bin' : trainPanelVisible ? 'train-panel' : 'none';

        return { expected, visible, match: expected === visible };
    }

    /**
     * Run all consistency checks and produce a report.
     */
    async fullCheck(): Promise<ConsistencyReport> {
        const issues: string[] = [];

        // Track count check
        const edgeCount = await this.stores.getEdgeCount();
        const renderedCount = await this.getRenderedTrackCount();
        const trackMatch = renderedCount === -1 ? true : edgeCount === renderedCount; // -1 means stage not available, skip

        if (!trackMatch) {
            issues.push(`Track count mismatch: store has ${edgeCount} edges, canvas rendered ${renderedCount} groups`);
        }

        // Mode UI check
        const modeCheck = await this.checkModeConsistency();
        if (!modeCheck.match) {
            issues.push(`Mode mismatch: store says "${modeCheck.storeMode}", UI shows "${modeCheck.uiMode}"`);
        }

        // Sidebar check
        const sidebarCheck = await this.checkSidebarConsistency();
        if (!sidebarCheck.match) {
            issues.push(`Sidebar mismatch: expected "${sidebarCheck.expected}", visible "${sidebarCheck.visible}"`);
        }

        return {
            trackEdgeCount: { store: edgeCount, rendered: renderedCount, match: trackMatch },
            modeUiMatch: modeCheck.match,
            issues,
        };
    }
}
