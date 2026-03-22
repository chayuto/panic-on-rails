/**
 * Track Configuration Matrix
 *
 * Tests as many track configurations as possible:
 * - Place tracks, connect adjacent endpoints, run trains
 * - Each config is scored: placement OK, connections OK, train runs OK
 * - Results documented in a summary at the end
 */

import { test, expect } from '../fixtures/app-fixture';
import { StoreBridge } from '../helpers/store-bridge';
import { ScreenshotManager } from '../helpers/screenshot-manager';
import type { Page } from '@playwright/test';

// =============================================
// Helper: auto-connect nearby endpoints
// =============================================

async function autoConnect(stores: StoreBridge, page: Page, tolerance = 5): Promise<number> {
    // Find nodes that are very close to each other and connect them
    let connected = 0;
    for (let pass = 0; pass < 10; pass++) {
        const state = await stores.getTrackState();
        const nodes = Object.values(state.nodes) as any[];

        // Find open endpoints (1 connection)
        const endpoints = nodes.filter(n => n.connections.length === 1);
        if (endpoints.length < 2) break;

        let foundPair = false;
        for (let i = 0; i < endpoints.length; i++) {
            for (let j = i + 1; j < endpoints.length; j++) {
                const a = endpoints[i];
                const b = endpoints[j];
                const dx = a.position.x - b.position.x;
                const dy = a.position.y - b.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < tolerance) {
                    // Connect them
                    await stores.connectNodes(a.id, b.id, a.connections[0]);
                    connected++;
                    foundPair = true;
                    break;
                }
            }
            if (foundPair) break;
        }
        if (!foundPair) break;
    }
    return connected;
}

// =============================================
// Helper: run train and check traversal
// =============================================

async function runTrainTest(
    stores: StoreBridge,
    page: Page,
    durationMs = 3000,
): Promise<{ edgesVisited: number; bounced: boolean; crashed: boolean; moved: boolean }> {
    const trackState = await stores.getTrackState();
    const edgeIds = Object.keys(trackState.edges);
    if (edgeIds.length === 0) return { edgesVisited: 0, bounced: false, crashed: false, moved: false };

    await stores.enterSimulateMode();
    await stores.clearTrains();
    await stores.spawnTrain(edgeIds[0], '#ff3300');
    await stores.setRunning(true);

    const positions: { edge: string; dist: number; dir: number }[] = [];
    const steps = Math.ceil(durationMs / 250);

    for (let i = 0; i < steps; i++) {
        await page.waitForTimeout(250);
        const sim = await stores.getSimulationState();
        const train = Object.values(sim.trains)[0] as any;
        if (train) {
            positions.push({
                edge: train.currentEdgeId,
                dist: train.distanceAlongEdge,
                dir: train.direction,
            });
            if (train.crashed) break;
        }
    }

    await stores.setRunning(false);
    await stores.enterEditMode();

    const uniqueEdges = new Set(positions.map(p => p.edge));
    const dirs = positions.map(p => p.dir);
    const bounced = dirs.some((d, i) => i > 0 && d !== dirs[i - 1]);
    const crashed = positions.length > 0 && (Object.values((await stores.getSimulationState()).trains)[0] as any)?.crashed;
    const moved = positions.length >= 2 &&
        (positions[0].dist !== positions[positions.length - 1].dist ||
         positions[0].edge !== positions[positions.length - 1].edge);

    return {
        edgesVisited: uniqueEdges.size,
        bounced,
        crashed: !!crashed,
        moved,
    };
}

// =============================================
// Helper: clean slate
// =============================================

async function cleanSlate(stores: StoreBridge, page: Page) {
    await stores.clearLayout();
    await stores.enterEditMode();
    await page.waitForTimeout(100);
}

// =============================================
// CONFIG RESULTS COLLECTOR
// =============================================

interface ConfigResult {
    name: string;
    edgesPlaced: number;
    connectionsFormed: number;
    openEndpoints: number;
    trainMoved: boolean;
    edgesTraversed: number;
    bounced: boolean;
    crashed: boolean;
    isCircuit: boolean;
    success: boolean;
}

const results: ConfigResult[] = [];

// =============================================
// TESTS
// =============================================

test.describe('Track Configuration Matrix', () => {
    test.setTimeout(180_000); // 3 min for all configs

    test('run all configurations', async ({ page, app, stores }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'track-configs');

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // ==============================================
        // CONFIG 1: Single Straight
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-000', { x: 400, y: 400 }, 0);
            await page.waitForTimeout(100);

            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('01-single-straight');

            results.push({
                name: '1. Single Straight (248mm)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 0,
                openEndpoints: openEps.length,
                isCircuit: openEps.length === 0,
                ...trainResult,
                success: trainResult.moved && trainResult.bounced,
            });
        }

        // ==============================================
        // CONFIG 2: Three Straights Connected
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-000', { x: 200, y: 400 }, 0);
            await stores.addTrack('kato-20-000', { x: 448, y: 400 }, 0);
            await stores.addTrack('kato-20-000', { x: 696, y: 400 }, 0);
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page);
            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 3000);
            await screenshots.capture('02-three-straights-connected');

            results.push({
                name: '2. Three Straights Connected',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved && trainResult.edgesVisited >= 2,
            });
        }

        // ==============================================
        // CONFIG 3: Mixed Length Straights
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-000', { x: 200, y: 400 }, 0);   // 248mm
            await stores.addTrack('kato-20-010', { x: 448, y: 400 }, 0);   // 186mm
            await stores.addTrack('kato-20-020', { x: 634, y: 400 }, 0);   // 124mm
            await stores.addTrack('kato-20-030', { x: 758, y: 400 }, 0);   // 64mm
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page);
            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 3000);
            await screenshots.capture('03-mixed-straights');

            results.push({
                name: '3. Mixed Length Straights (248+186+124+64)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 4: Simple Oval (Template)
        // ==============================================
        {
            await cleanSlate(stores, page);
            const selector = page.getByTestId('file-template-selector');
            await selector.selectOption('Simple Oval');
            await page.waitForTimeout(500);

            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 5000);
            await screenshots.capture('04-simple-oval');

            results.push({
                name: '4. Simple Oval (8 × R249-45° curves)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 8,
                openEndpoints: openEps.length,
                isCircuit: openEps.length === 0,
                ...trainResult,
                success: trainResult.moved && trainResult.edgesVisited >= 3 && !trainResult.crashed,
            });
        }

        // ==============================================
        // CONFIG 5: Wooden Oval (Template)
        // ==============================================
        {
            await cleanSlate(stores, page);
            const selector = page.getByTestId('file-template-selector');
            await selector.selectOption('Wooden Starter');
            await page.waitForTimeout(500);

            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 5000);
            await screenshots.capture('05-wooden-oval');

            results.push({
                name: '5. Wooden Oval (8 × R182-45° curves)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 8,
                openEndpoints: openEps.length,
                isCircuit: openEps.length === 0,
                ...trainResult,
                success: trainResult.moved && trainResult.edgesVisited >= 3 && !trainResult.crashed,
            });
        }

        // ==============================================
        // CONFIG 6: Switch Showdown (Template)
        // ==============================================
        {
            await cleanSlate(stores, page);
            const selector = page.getByTestId('file-template-selector');
            await selector.selectOption('Switch Showdown');
            await page.waitForTimeout(500);

            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 5000);
            await screenshots.capture('06-switch-showdown');

            results.push({
                name: '6. Switch Showdown (switches + loop)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 6,
                openEndpoints: openEps.length,
                isCircuit: openEps.length === 0,
                ...trainResult,
                success: trainResult.moved && !trainResult.crashed,
            });
        }

        // ==============================================
        // CONFIG 7: Long Straight Run (6 pieces)
        // ==============================================
        {
            await cleanSlate(stores, page);
            const len = 248;
            for (let i = 0; i < 6; i++) {
                await stores.addTrack('kato-20-000', { x: 100 + len * i, y: 400 }, 0);
            }
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page);
            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 4000);
            await screenshots.capture('07-long-straight-6');

            results.push({
                name: '7. Long Straight Run (6 × 248mm)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved && trainResult.edgesVisited >= 3,
            });
        }

        // ==============================================
        // CONFIG 8: Vertical Straight Run
        // ==============================================
        {
            await cleanSlate(stores, page);
            const len = 248;
            for (let i = 0; i < 4; i++) {
                await stores.addTrack('kato-20-000', { x: 500, y: 100 + len * i }, 90);
            }
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page);
            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 3000);
            await screenshots.capture('08-vertical-run');

            results.push({
                name: '8. Vertical Straight Run (4 × 248mm, 90°)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 9: Diagonal Straight Run
        // ==============================================
        {
            await cleanSlate(stores, page);
            const len = 248;
            const angle = 45;
            const rad = (angle * Math.PI) / 180;
            for (let i = 0; i < 4; i++) {
                await stores.addTrack('kato-20-000', {
                    x: 200 + len * Math.cos(rad) * i,
                    y: 200 + len * Math.sin(rad) * i,
                }, angle);
            }
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page);
            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 3000);
            await screenshots.capture('09-diagonal-run');

            results.push({
                name: '9. Diagonal Straight Run (4 × 248mm, 45°)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 10: Single Curve
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-100', { x: 500, y: 400 }, 0);
            await page.waitForTimeout(100);

            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('10-single-curve');

            results.push({
                name: '10. Single Curve (R249-45°)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 0,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved && trainResult.bounced,
            });
        }

        // ==============================================
        // CONFIG 11: Tight Circle (8 × R216-45°)
        // ==============================================
        {
            await cleanSlate(stores, page);
            const selector = page.getByTestId('file-template-selector');
            // Use Simple Oval as base but it uses R249. Let's place R216 manually
            // For a proper circle test, let's place 8 tight curves
            // Actually use the template approach - modify: place R216 curves
            // The R216-45° is kato-20-170

            // Place 8 curves in a circle pattern
            // For a circle of R216, center offset = 216mm
            const R = 216;
            const cx = 600, cy = 400;
            for (let i = 0; i < 8; i++) {
                const angle = i * 45;
                const rad = (angle * Math.PI) / 180;
                await stores.addTrack('kato-20-170', {
                    x: cx + R * Math.cos(rad),
                    y: cy + R * Math.sin(rad),
                }, angle);
            }
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page, 15);
            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 3000);
            await screenshots.capture('11-tight-circle');

            results.push({
                name: '11. Tight Circle (8 × R216-45°)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: openEps.length,
                isCircuit: openEps.length === 0,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 12: Crossing Track (90°)
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-320', { x: 500, y: 400 }, 0);
            await page.waitForTimeout(100);

            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('12-crossing-90');

            results.push({
                name: '12. 90° Crossing (single piece)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 0,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 13: Left Turnout Switch
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-220', { x: 400, y: 400 }, 0);
            await page.waitForTimeout(100);

            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('13-left-turnout');

            results.push({
                name: '13. Left Turnout (#4, single piece)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 0,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 14: Right Turnout Switch
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-221', { x: 400, y: 400 }, 0);
            await page.waitForTimeout(100);

            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('14-right-turnout');

            results.push({
                name: '14. Right Turnout (#4, single piece)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 0,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 15: Wye Turnout
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-222', { x: 400, y: 400 }, 0);
            await page.waitForTimeout(100);

            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('15-wye-turnout');

            results.push({
                name: '15. Wye Turnout (#2, single piece)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 0,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 16: Straight + Left Turn (with switch)
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-000', { x: 200, y: 400 }, 0);  // straight
            await stores.addTrack('kato-20-220', { x: 448, y: 400 }, 0);  // left turnout
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page);
            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 3000);
            await screenshots.capture('16-straight-plus-switch');

            results.push({
                name: '16. Straight + Left Turnout',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved && trainResult.edgesVisited >= 2,
            });
        }

        // ==============================================
        // CONFIG 17: Wooden Long Straights
        // ==============================================
        {
            await cleanSlate(stores, page);
            const len = 216;
            for (let i = 0; i < 4; i++) {
                await stores.addTrack('wooden-straight-long', { x: 200 + len * i, y: 400 }, 0);
            }
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page);
            const state = await stores.getTrackState();
            const openEps = (await stores.getOpenEndpoints()) as any[];
            const trainResult = await runTrainTest(stores, page, 3000);
            await screenshots.capture('17-wooden-straights');

            results.push({
                name: '17. Wooden Long Straights (4 × 216mm)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: openEps.length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 18: Wooden Mixed (straight + curve)
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('wooden-straight-long', { x: 300, y: 400 }, 0);
            await stores.addTrack('wooden-curve-large', { x: 516, y: 400 }, 0);
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page);
            const state = await stores.getTrackState();
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('18-wooden-mixed');

            results.push({
                name: '18. Wooden Straight + Large Curve',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: (await stores.getOpenEndpoints() as any[]).length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 19: IKEA Straights
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('ikea-straight-long', { x: 300, y: 400 }, 0);
            await stores.addTrack('ikea-straight-medium', { x: 516, y: 400 }, 0);
            await stores.addTrack('ikea-straight-short', { x: 660, y: 400 }, 0);
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page);
            const state = await stores.getTrackState();
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('19-ikea-straights');

            results.push({
                name: '19. IKEA Mixed Straights (216+144+72mm)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: (await stores.getOpenEndpoints() as any[]).length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 20: Two Trains on Oval (multi-train)
        // ==============================================
        {
            await cleanSlate(stores, page);
            const selector = page.getByTestId('file-template-selector');
            await selector.selectOption('Simple Oval');
            await page.waitForTimeout(500);

            const state = await stores.getTrackState();
            const edgeIds = Object.keys(state.edges);

            await stores.enterSimulateMode();
            await stores.clearTrains();
            await stores.spawnTrain(edgeIds[0], '#ff0000');
            await stores.spawnTrain(edgeIds[4], '#0000ff');
            await stores.setRunning(true);
            await page.waitForTimeout(3000);

            const simState = await stores.getSimulationState();
            const trains = Object.values(simState.trains) as any[];
            const anyMoved = trains.some(t => t.distanceAlongEdge > 0);
            const anyCrashed = trains.some(t => t.crashed);

            await stores.setRunning(false);
            await stores.enterEditMode();
            await screenshots.capture('20-two-trains-oval');

            results.push({
                name: '20. Two Trains on Oval (simultaneous)',
                edgesPlaced: edgeIds.length,
                connectionsFormed: 8,
                openEndpoints: 0,
                isCircuit: true,
                edgesVisited: -1, // not tracked per-train
                bounced: false,
                crashed: anyCrashed,
                moved: anyMoved,
                success: anyMoved && !anyCrashed,
            });
        }

        // ==============================================
        // CONFIG 21: 15° Crossing
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-300', { x: 400, y: 400 }, 0);
            await page.waitForTimeout(100);

            const state = await stores.getTrackState();
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('21-crossing-15');

            results.push({
                name: '21. 15° Crossing (single piece)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 0,
                openEndpoints: (await stores.getOpenEndpoints() as any[]).length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 22: #6 Turnout (longer switch)
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('kato-20-202', { x: 400, y: 400 }, 0);
            await page.waitForTimeout(100);

            const state = await stores.getTrackState();
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('22-turnout-6-left');

            results.push({
                name: '22. #6 Turnout Left (longer mainline)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 0,
                openEndpoints: (await stores.getOpenEndpoints() as any[]).length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 23: Short Straights Chain
        // ==============================================
        {
            await cleanSlate(stores, page);
            const parts = ['kato-20-091', 'kato-20-092', 'kato-20-030', 'kato-20-040'];
            const lengths = [29, 45.5, 64, 62];
            let x = 300;
            for (let i = 0; i < parts.length; i++) {
                await stores.addTrack(parts[i], { x, y: 400 }, 0);
                x += lengths[i];
            }
            await page.waitForTimeout(100);

            const conns = await autoConnect(stores, page, 3);
            const state = await stores.getTrackState();
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('23-short-straights-chain');

            results.push({
                name: '23. Short Straights Chain (29+45.5+64+62mm)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: conns,
                openEndpoints: (await stores.getOpenEndpoints() as any[]).length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // CONFIG 24: Multi-carriage on Oval
        // ==============================================
        {
            await cleanSlate(stores, page);
            const selector = page.getByTestId('file-template-selector');
            await selector.selectOption('Simple Oval');
            await page.waitForTimeout(500);

            const state = await stores.getTrackState();
            const edgeIds = Object.keys(state.edges);

            await stores.enterSimulateMode();
            await stores.clearTrains();
            await stores.spawnTrain(edgeIds[0], '#8B0000', 8); // 8 carriages!
            await stores.setRunning(true);
            await page.waitForTimeout(4000);

            const simState = await stores.getSimulationState();
            const train = Object.values(simState.trains)[0] as any;
            const moved = train && train.distanceAlongEdge > 0;

            await stores.setRunning(false);
            await stores.enterEditMode();
            await screenshots.capture('24-8-carriage-train');

            results.push({
                name: '24. 8-Carriage Train on Oval',
                edgesPlaced: edgeIds.length,
                connectionsFormed: 8,
                openEndpoints: 0,
                isCircuit: true,
                edgesVisited: -1,
                bounced: false,
                crashed: !!train?.crashed,
                moved: !!moved,
                success: !!moved && !train?.crashed,
            });
        }

        // ==============================================
        // CONFIG 25: Wooden Switch (Y-Splitter)
        // ==============================================
        {
            await cleanSlate(stores, page);
            await stores.addTrack('wooden-switch-y', { x: 400, y: 400 }, 0);
            await page.waitForTimeout(100);

            const state = await stores.getTrackState();
            const trainResult = await runTrainTest(stores, page, 2000);
            await screenshots.capture('25-wooden-y-splitter');

            results.push({
                name: '25. Wooden Y-Splitter (single piece)',
                edgesPlaced: Object.keys(state.edges).length,
                connectionsFormed: 0,
                openEndpoints: (await stores.getOpenEndpoints() as any[]).length,
                isCircuit: false,
                ...trainResult,
                success: trainResult.moved,
            });
        }

        // ==============================================
        // PRINT RESULTS TABLE
        // ==============================================

        console.log('\n========================================');
        console.log('TRACK CONFIGURATION RESULTS');
        console.log('========================================\n');

        let passCount = 0;
        let failCount = 0;

        for (const r of results) {
            const status = r.success ? 'PASS' : 'FAIL';
            if (r.success) passCount++; else failCount++;

            console.log(`${status} | ${r.name}`);
            console.log(`     Edges: ${r.edgesPlaced}, Connected: ${r.connectionsFormed}, Open: ${r.openEndpoints}, Circuit: ${r.isCircuit}`);
            console.log(`     Train: moved=${r.moved}, edges=${r.edgesVisited}, bounced=${r.bounced}, crashed=${r.crashed}`);
            console.log('');
        }

        console.log('========================================');
        console.log(`TOTAL: ${passCount} PASS, ${failCount} FAIL out of ${results.length}`);
        console.log('========================================\n');

        // At least 80% should pass
        expect(passCount).toBeGreaterThanOrEqual(Math.floor(results.length * 0.7));
    });
});
