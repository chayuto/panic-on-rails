/**
 * Store Bridge — Playwright-side wrapper for window.__PANIC_STORES__
 *
 * Provides typed access to all Zustand stores from test code via page.evaluate().
 * Every method crosses the browser boundary, so all returns are serializable.
 */

import type { Page } from '@playwright/test';
import type {
    Vector2,
    TrackStateSnapshot,
    ModeStateSnapshot,
    SimulationStateSnapshot,
    EditorStateSnapshot,
    AllStoresSnapshot,
} from './types';

export class StoreBridge {
    constructor(private page: Page) {}

    // ===========================
    // Readiness
    // ===========================

    /** Wait for the debug bridge to be available on the page. */
    async waitForBridge(timeout = 10_000): Promise<void> {
        await this.page.waitForFunction(
            () => !!window.__PANIC_STORES__,
            { timeout },
        );
    }

    // ===========================
    // Track Store
    // ===========================

    async getTrackState(): Promise<TrackStateSnapshot> {
        return this.page.evaluate(() => window.__PANIC_STORES__!.track.getState()) as Promise<TrackStateSnapshot>;
    }

    async getNodeCount(): Promise<number> {
        return this.page.evaluate(() =>
            Object.keys(window.__PANIC_STORES__!.track.getState().nodes).length
        );
    }

    async getEdgeCount(): Promise<number> {
        return this.page.evaluate(() =>
            Object.keys(window.__PANIC_STORES__!.track.getState().edges).length
        );
    }

    async getOpenEndpoints(): Promise<unknown[]> {
        return this.page.evaluate(() =>
            window.__PANIC_STORES__!.track.getOpenEndpoints()
        ) as Promise<unknown[]>;
    }

    async addTrack(partId: string, position: Vector2, rotation: number): Promise<string | null> {
        return this.page.evaluate(
            ({ partId, position, rotation }) =>
                window.__PANIC_STORES__!.track.addTrack(partId, position, rotation),
            { partId, position, rotation },
        );
    }

    async removeTrack(edgeId: string): Promise<void> {
        await this.page.evaluate(
            (id) => window.__PANIC_STORES__!.track.removeTrack(id),
            edgeId,
        );
    }

    async clearLayout(): Promise<void> {
        await this.page.evaluate(() => window.__PANIC_STORES__!.track.clearLayout());
    }

    async loadLayout(layoutJson: object): Promise<void> {
        await this.page.evaluate(
            (data) => window.__PANIC_STORES__!.track.loadLayout(data),
            layoutJson,
        );
    }

    async connectNodes(survivorId: string, removedId: string, edgeId: string): Promise<void> {
        await this.page.evaluate(
            ({ survivorId, removedId, edgeId }) =>
                window.__PANIC_STORES__!.track.connectNodes(survivorId, removedId, edgeId),
            { survivorId, removedId, edgeId },
        );
    }

    async toggleSwitch(nodeId: string): Promise<void> {
        await this.page.evaluate(
            (id) => window.__PANIC_STORES__!.track.toggleSwitch(id),
            nodeId,
        );
    }

    // ===========================
    // Mode Store
    // ===========================

    async getModeState(): Promise<ModeStateSnapshot> {
        return this.page.evaluate(() =>
            window.__PANIC_STORES__!.mode.getState()
        );
    }

    async enterEditMode(): Promise<void> {
        await this.page.evaluate(() => window.__PANIC_STORES__!.mode.enterEditMode());
    }

    async enterSimulateMode(): Promise<void> {
        await this.page.evaluate(() => window.__PANIC_STORES__!.mode.enterSimulateMode());
    }

    async setEditSubMode(mode: string): Promise<void> {
        await this.page.evaluate(
            (m) => window.__PANIC_STORES__!.mode.setEditSubMode(m),
            mode,
        );
    }

    // ===========================
    // Simulation Store
    // ===========================

    async getSimulationState(): Promise<SimulationStateSnapshot> {
        return this.page.evaluate(() =>
            window.__PANIC_STORES__!.simulation.getState()
        ) as Promise<SimulationStateSnapshot>;
    }

    async spawnTrain(edgeId: string, color?: string, carriageCount?: number): Promise<string> {
        return this.page.evaluate(
            ({ edgeId, color, carriageCount }) =>
                window.__PANIC_STORES__!.simulation.spawnTrain(edgeId, color, carriageCount),
            { edgeId, color, carriageCount },
        );
    }

    async removeTrain(trainId: string): Promise<void> {
        await this.page.evaluate(
            (id) => window.__PANIC_STORES__!.simulation.removeTrain(id),
            trainId,
        );
    }

    async setRunning(running: boolean): Promise<void> {
        await this.page.evaluate(
            (r) => window.__PANIC_STORES__!.simulation.setRunning(r),
            running,
        );
    }

    async toggleRunning(): Promise<void> {
        await this.page.evaluate(() => window.__PANIC_STORES__!.simulation.toggleRunning());
    }

    async clearTrains(): Promise<void> {
        await this.page.evaluate(() => window.__PANIC_STORES__!.simulation.clearTrains());
    }

    async setSpeedMultiplier(multiplier: number): Promise<void> {
        await this.page.evaluate(
            (m) => window.__PANIC_STORES__!.simulation.setSpeedMultiplier(m),
            multiplier,
        );
    }

    // ===========================
    // Editor Store
    // ===========================

    async getEditorState(): Promise<EditorStateSnapshot> {
        return this.page.evaluate(() =>
            window.__PANIC_STORES__!.editor.getState()
        ) as Promise<EditorStateSnapshot>;
    }

    async setSelectedPart(partId: string): Promise<void> {
        await this.page.evaluate(
            (id) => window.__PANIC_STORES__!.editor.setSelectedPart(id),
            partId,
        );
    }

    async setSelectedSystem(system: 'n-scale' | 'wooden'): Promise<void> {
        await this.page.evaluate(
            (s) => window.__PANIC_STORES__!.editor.setSelectedSystem(s),
            system,
        );
    }

    async resetView(): Promise<void> {
        await this.page.evaluate(() => window.__PANIC_STORES__!.editor.resetView());
    }

    // ===========================
    // Full Snapshot
    // ===========================

    async getFullState(): Promise<AllStoresSnapshot> {
        return this.page.evaluate(() => {
            const s = window.__PANIC_STORES__!;
            return {
                track: s.track.getState(),
                mode: s.mode.getState(),
                simulation: s.simulation.getState(),
                editor: s.editor.getState(),
                logic: s.logic.getState(),
                budget: s.budget.getState(),
            };
        }) as Promise<AllStoresSnapshot>;
    }

    // ===========================
    // Waiting Helpers
    // ===========================

    async waitForEdgeCount(count: number, timeout = 5_000): Promise<void> {
        await this.page.waitForFunction(
            (expected) =>
                Object.keys(window.__PANIC_STORES__!.track.getState().edges).length === expected,
            count,
            { timeout },
        );
    }

    async waitForTrainCount(count: number, timeout = 5_000): Promise<void> {
        await this.page.waitForFunction(
            (expected) =>
                Object.keys(window.__PANIC_STORES__!.simulation.getState().trains).length === expected,
            count,
            { timeout },
        );
    }
}
