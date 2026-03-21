/**
 * Scenario Builder — Pre-built recipes for common test scenarios.
 *
 * Composes AgentActions into higher-level workflows like
 * "build an oval circuit" or "run a simulation for N seconds".
 */

import type { Page } from '@playwright/test';
import { AgentActions } from './agent-actions';
import { StoreBridge } from './store-bridge';
import type { Vector2 } from './types';

export class ScenarioBuilder {
    constructor(
        private agent: AgentActions,
        private stores: StoreBridge,
        private page: Page,
    ) {}

    /**
     * Build a straight run of N identical track pieces.
     * Pieces are placed end-to-end along the given direction.
     */
    async buildStraightRun(
        count: number,
        startPosition: Vector2 = { x: 300, y: 400 },
        partId = 'kato-20-000',
        rotation = 0,
    ): Promise<string[]> {
        return this.agent.buildStraightRun(partId, count, startPosition, rotation);
    }

    /**
     * Place tracks in a circle using curve parts.
     * Uses Kato R216-45 curves (45° each, 8 pieces = full circle).
     */
    async buildCircle(
        center: Vector2 = { x: 500, y: 400 },
        partId = 'kato-20-100',
        pieceCount = 8,
    ): Promise<string[]> {
        const edgeIds: string[] = [];

        // Place curve pieces around the circle
        // Each Kato R216-45 is a 45° arc, so 8 pieces = 360°
        const angleStep = 360 / pieceCount;

        for (let i = 0; i < pieceCount; i++) {
            const angle = angleStep * i;
            const radians = (angle * Math.PI) / 180;

            // Position each curve piece at the right spot around the circle
            // The radius for R216-45 is 216mm in N-scale
            const radius = 216;
            const pos: Vector2 = {
                x: center.x + radius * Math.cos(radians),
                y: center.y + radius * Math.sin(radians),
            };

            const edgeId = await this.agent.placeTrack(partId, pos, angle);
            if (edgeId) edgeIds.push(edgeId);
        }

        return edgeIds;
    }

    /**
     * Load a template layout by name.
     * Uses the app's built-in template system.
     */
    async loadTemplate(templateId: string): Promise<void> {
        // Click the template selector dropdown
        const selector = this.page.getByTestId('file-template-selector');
        await selector.selectOption(templateId);
        // Wait for the layout to load
        await this.page.waitForTimeout(500);
    }

    /**
     * Spawn a train and run the simulation for a duration.
     * Returns train positions captured at intervals.
     */
    async runSimulationFor(
        durationMs: number,
        captureIntervalMs = 500,
        edgeId?: string,
    ): Promise<Array<{ time: number; trains: Record<string, unknown> }>> {
        // Ensure simulate mode
        await this.agent.switchMode('simulate');

        // Spawn a train if needed
        if (edgeId) {
            await this.stores.spawnTrain(edgeId);
        }

        // Start simulation
        await this.stores.setRunning(true);

        const snapshots: Array<{ time: number; trains: Record<string, unknown> }> = [];
        const startTime = Date.now();

        while (Date.now() - startTime < durationMs) {
            await this.page.waitForTimeout(captureIntervalMs);
            const simState = await this.stores.getSimulationState();
            snapshots.push({
                time: Date.now() - startTime,
                trains: simState.trains,
            });
        }

        // Stop simulation
        await this.stores.setRunning(false);

        return snapshots;
    }
}
