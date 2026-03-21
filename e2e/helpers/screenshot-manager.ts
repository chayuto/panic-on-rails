/**
 * Screenshot Manager — Capture screenshots + state snapshots together.
 *
 * Every `capture()` call saves:
 *   1. A PNG screenshot of the page (or canvas only)
 *   2. A JSON file with the full store state at that moment
 *
 * Files land in e2e-screenshots/{testName}/{step}-{label}.png / .state.json
 * so an AI agent can read both the visual and data state.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Page } from '@playwright/test';
import { StoreBridge } from './store-bridge';
import type { AllStoresSnapshot } from './types';

const SCREENSHOT_ROOT = path.resolve(process.cwd(), 'e2e-screenshots');

export class ScreenshotManager {
    private step = 0;
    private testDir: string;

    constructor(
        private page: Page,
        private stores: StoreBridge,
        testName: string,
    ) {
        // Sanitize test name for filesystem
        const safe = testName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').substring(0, 80);
        this.testDir = path.join(SCREENSHOT_ROOT, safe);

        // Clean and create directory
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true });
        }
        fs.mkdirSync(this.testDir, { recursive: true });
    }

    /**
     * Capture a full-page screenshot + store state snapshot.
     * Returns paths to both files and the state object.
     */
    async capture(label: string): Promise<{
        screenshotPath: string;
        statePath: string;
        state: AllStoresSnapshot;
    }> {
        this.step++;
        const prefix = String(this.step).padStart(3, '0');
        const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '-');

        const screenshotPath = path.join(this.testDir, `${prefix}-${safeLabel}.png`);
        const statePath = path.join(this.testDir, `${prefix}-${safeLabel}.state.json`);

        // Capture screenshot and state in parallel
        const [, state] = await Promise.all([
            this.page.screenshot({ path: screenshotPath, fullPage: false }),
            this.stores.getFullState(),
        ]);

        // Write state JSON
        const stateDoc = {
            timestamp: new Date().toISOString(),
            step: this.step,
            label,
            stores: {
                track: {
                    nodeCount: Object.keys(state.track.nodes).length,
                    edgeCount: Object.keys(state.track.edges).length,
                    nodes: state.track.nodes,
                    edges: state.track.edges,
                },
                mode: state.mode,
                simulation: {
                    trainCount: Object.keys(state.simulation.trains).length,
                    isRunning: state.simulation.isRunning,
                    speedMultiplier: state.simulation.speedMultiplier,
                    error: state.simulation.error,
                    trains: state.simulation.trains,
                },
                editor: {
                    selectedPartId: state.editor.selectedPartId,
                    selectedSystem: state.editor.selectedSystem,
                    zoom: state.editor.zoom,
                    pan: state.editor.pan,
                },
                budget: state.budget,
            },
        };

        fs.writeFileSync(statePath, JSON.stringify(stateDoc, null, 2));

        return { screenshotPath, statePath, state };
    }

    /**
     * Capture only the canvas element (no toolbar/sidebar).
     */
    async captureCanvas(label: string): Promise<{
        screenshotPath: string;
        statePath: string;
        state: AllStoresSnapshot;
    }> {
        this.step++;
        const prefix = String(this.step).padStart(3, '0');
        const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '-');

        const screenshotPath = path.join(this.testDir, `${prefix}-${safeLabel}-canvas.png`);
        const statePath = path.join(this.testDir, `${prefix}-${safeLabel}.state.json`);

        const canvas = this.page.getByTestId('canvas-container');

        const [, state] = await Promise.all([
            canvas.screenshot({ path: screenshotPath }),
            this.stores.getFullState(),
        ]);

        const stateDoc = {
            timestamp: new Date().toISOString(),
            step: this.step,
            label,
            stores: {
                track: {
                    nodeCount: Object.keys(state.track.nodes).length,
                    edgeCount: Object.keys(state.track.edges).length,
                },
                mode: state.mode,
                simulation: {
                    trainCount: Object.keys(state.simulation.trains).length,
                    isRunning: state.simulation.isRunning,
                },
            },
        };

        fs.writeFileSync(statePath, JSON.stringify(stateDoc, null, 2));

        return { screenshotPath, statePath, state };
    }

    /** Get the directory where screenshots are saved. */
    getDir(): string {
        return this.testDir;
    }
}
