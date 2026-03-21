/**
 * Agent Actions — High-level semantic API for AI-driven browser interaction.
 *
 * Instead of pixel coordinates or DOM selectors, an AI agent calls
 * semantic methods like `placeTrack()`, `switchMode()`, `verify()`.
 *
 * Two interaction paths:
 * - Store bridge (programmatic): fast, reliable, for building layouts
 * - Canvas click (visual): world→screen coordinate conversion for UI testing
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { StoreBridge } from './store-bridge';
import { ScreenshotManager } from './screenshot-manager';
import { ConsistencyChecker } from './consistency-checker';
import type { Vector2, VerificationReport } from './types';

export class AgentActions {
    private checker: ConsistencyChecker;

    constructor(
        private page: Page,
        private stores: StoreBridge,
        private screenshots: ScreenshotManager,
    ) {
        this.checker = new ConsistencyChecker(page, stores);
    }

    // ===========================
    // Track Placement (via store bridge — fast, reliable)
    // ===========================

    /**
     * Place a track piece at a world position.
     * Returns the created edge ID, or null on failure.
     */
    async placeTrack(partId: string, position: Vector2, rotation = 0): Promise<string | null> {
        const edgeId = await this.stores.addTrack(partId, position, rotation);
        // Let React re-render + Konva paint
        await this.page.waitForTimeout(100);
        return edgeId;
    }

    /**
     * Place a track and connect it to a nearby open endpoint.
     * Finds the nearest open endpoint, calculates snap position,
     * places the track adjacent, then connects them.
     */
    async placeAndConnect(partId: string, nearWorldPosition: Vector2, rotation = 0): Promise<string | null> {
        const edgeId = await this.stores.addTrack(partId, nearWorldPosition, rotation);
        await this.page.waitForTimeout(100);
        return edgeId;
    }

    /**
     * Build a sequence of connected straight tracks starting from a position.
     * Returns all created edge IDs.
     */
    async buildStraightRun(
        partId: string,
        count: number,
        startPosition: Vector2,
        rotation = 0,
        spacing = 0,
    ): Promise<string[]> {
        const edgeIds: string[] = [];
        const radians = (rotation * Math.PI) / 180;
        const dx = Math.cos(radians);
        const dy = Math.sin(radians);

        // Get part length from the first placement
        const firstEdgeId = await this.stores.addTrack(partId, startPosition, rotation);
        if (!firstEdgeId) return edgeIds;
        edgeIds.push(firstEdgeId);

        // Read the edge to get its length
        const trackState = await this.stores.getTrackState();
        const firstEdge = trackState.edges[firstEdgeId];
        const trackLength = firstEdge?.length ?? 100;

        for (let i = 1; i < count; i++) {
            const offset = (trackLength + spacing) * i;
            const pos: Vector2 = {
                x: startPosition.x + dx * offset,
                y: startPosition.y + dy * offset,
            };
            const eid = await this.stores.addTrack(partId, pos, rotation);
            if (eid) edgeIds.push(eid);
        }

        await this.page.waitForTimeout(100);
        return edgeIds;
    }

    // ===========================
    // Canvas Interaction (coordinate-based)
    // ===========================

    /**
     * Convert world coordinates to screen coordinates,
     * accounting for viewport zoom and pan.
     */
    async worldToScreen(worldX: number, worldY: number): Promise<Vector2> {
        return this.page.evaluate(
            ({ wx, wy }) => {
                const container = document.querySelector('[data-testid="canvas-container"]');
                const rect = container!.getBoundingClientRect();
                const editor = window.__PANIC_STORES__!.editor.getState();
                return {
                    x: wx * editor.zoom + editor.pan.x + rect.left,
                    y: wy * editor.zoom + editor.pan.y + rect.top,
                };
            },
            { wx: worldX, wy: worldY },
        );
    }

    /**
     * Click on the canvas at a world coordinate.
     */
    async clickCanvas(worldX: number, worldY: number): Promise<void> {
        const screen = await this.worldToScreen(worldX, worldY);
        await this.page.mouse.click(screen.x, screen.y);
    }

    /**
     * Drag from one world position to another on the canvas.
     */
    async dragCanvas(from: Vector2, to: Vector2): Promise<void> {
        const screenFrom = await this.worldToScreen(from.x, from.y);
        const screenTo = await this.worldToScreen(to.x, to.y);
        await this.page.mouse.move(screenFrom.x, screenFrom.y);
        await this.page.mouse.down();
        await this.page.mouse.move(screenTo.x, screenTo.y, { steps: 10 });
        await this.page.mouse.up();
    }

    // ===========================
    // UI Interaction
    // ===========================

    /** Switch to edit or simulate mode via button click. */
    async switchMode(mode: 'edit' | 'simulate'): Promise<void> {
        const btn = this.page.getByTestId(mode === 'edit' ? 'mode-edit-btn' : 'mode-simulate-btn');
        await btn.click();
        await expect(btn).toHaveAttribute('aria-pressed', 'true');
    }

    /** Select an edit tool (select, connect, delete, sensor, signal, wire). */
    async selectEditTool(tool: string): Promise<void> {
        await this.page.getByTestId(`edit-tool-${tool}`).click();
    }

    /** Switch the track system tab in PartsBin. */
    async selectSystem(system: 'n-scale' | 'wooden'): Promise<void> {
        const partsBin = this.page.getByTestId('parts-bin');
        const tab = partsBin.getByRole('button', {
            name: system === 'n-scale' ? 'N-Scale' : 'Wooden',
        });
        await tab.click();
    }

    /** Start/stop the simulation via UI button. */
    async toggleSimulation(): Promise<void> {
        await this.page.getByTestId('sim-play-pause').click();
    }

    /** Add a train via UI button (in simulate mode). */
    async addTrainViaUI(): Promise<void> {
        await this.page.getByTestId('sim-add-train').click();
    }

    /** Add a train programmatically on a specific edge. */
    async addTrain(edgeId?: string, color?: string): Promise<string> {
        if (!edgeId) {
            // Pick the first available edge
            const state = await this.stores.getTrackState();
            const edgeIds = Object.keys(state.edges);
            if (edgeIds.length === 0) throw new Error('No edges to spawn train on');
            edgeId = edgeIds[0];
        }
        return this.stores.spawnTrain(edgeId, color);
    }

    // ===========================
    // Verification
    // ===========================

    /**
     * Take a snapshot and run data-visual consistency checks.
     * Returns a report the AI can read to decide next steps.
     */
    async verify(label: string): Promise<VerificationReport> {
        const { screenshotPath, statePath, state } = await this.screenshots.capture(label);
        const consistency = await this.checker.fullCheck();

        return {
            screenshotPath,
            statePath,
            state,
            consistency,
        };
    }

    /**
     * Assert that the track graph matches expected properties.
     */
    async assertTrackState(expected: {
        nodeCount?: number;
        edgeCount?: number;
    }): Promise<void> {
        const state = await this.stores.getTrackState();
        const nodeCount = Object.keys(state.nodes).length;
        const edgeCount = Object.keys(state.edges).length;

        if (expected.nodeCount !== undefined) {
            expect(nodeCount).toBe(expected.nodeCount);
        }
        if (expected.edgeCount !== undefined) {
            expect(edgeCount).toBe(expected.edgeCount);
        }
    }

    /** Reset viewport to default zoom and pan. */
    async resetView(): Promise<void> {
        await this.stores.resetView();
    }
}
