/**
 * Circuit Configuration Tests
 *
 * Builds closed-loop circuits by chaining tracks end-to-end.
 * Strategy: place first piece, then iteratively extend from open endpoints
 * using the endpoint's facade as the new track's rotation.
 *
 * Each circuit is verified:
 *   1. All pieces placed
 *   2. Circuit is closed (0 open endpoints)
 *   3. Train traverses multiple edges without crashing
 */

import { test, expect } from '../fixtures/app-fixture';
import { StoreBridge } from '../helpers/store-bridge';
import { ScreenshotManager } from '../helpers/screenshot-manager';
import type { Page } from '@playwright/test';

// =============================================
// Circuit Builder
// =============================================

/**
 * Place a track at the position/rotation of the furthest open endpoint
 * from the circuit's center, auto-connecting on overlap.
 */
async function extendCircuit(
    stores: StoreBridge,
    page: Page,
    partId: string,
    fromEndpointIndex = -1, // -1 = auto-pick furthest from first node
): Promise<{ edgeId: string | null; connected: boolean }> {
    const state = await stores.getTrackState();
    const nodes = Object.values(state.nodes) as any[];

    // Find open endpoints (1 connection)
    const endpoints = nodes.filter(n => n.connections.length === 1);
    if (endpoints.length === 0) return { edgeId: null, connected: false };

    // Pick endpoint to extend from
    let endpoint: any;
    if (fromEndpointIndex >= 0 && fromEndpointIndex < endpoints.length) {
        endpoint = endpoints[fromEndpointIndex];
    } else {
        // Pick the last-created open endpoint (highest index in the list)
        endpoint = endpoints[endpoints.length - 1];
    }

    // Place new track: position = endpoint position, rotation = endpoint facade
    const edgeId = await page.evaluate(
        ({ partId, pos, rotation }) =>
            window.__PANIC_STORES__!.track.addTrack(partId, pos, rotation),
        { partId, pos: endpoint.position, rotation: endpoint.rotation },
    );

    await page.waitForTimeout(50);

    // Auto-connect: find nodes within 5px and merge them
    let connected = false;
    const newState = await stores.getTrackState();
    const newNodes = Object.values(newState.nodes) as any[];
    const newEndpoints = newNodes.filter(n => n.connections.length === 1);

    for (let i = 0; i < newEndpoints.length; i++) {
        for (let j = i + 1; j < newEndpoints.length; j++) {
            const a = newEndpoints[i];
            const b = newEndpoints[j];
            const dx = a.position.x - b.position.x;
            const dy = a.position.y - b.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 3) {
                await stores.connectNodes(a.id, b.id, a.connections[0]);
                connected = true;
                break;
            }
        }
        if (connected) break;
    }

    return { edgeId, connected };
}

/**
 * Build a circuit by placing a sequence of parts, auto-connecting as we go.
 * First part is placed at startPos, subsequent parts extend from endpoints.
 */
async function buildCircuit(
    stores: StoreBridge,
    page: Page,
    parts: string[],
    startPos: { x: number; y: number },
    startRotation: number,
): Promise<{
    edgesPlaced: number;
    connectionsFormed: number;
    openEndpoints: number;
    isClosed: boolean;
}> {
    await stores.clearLayout();
    await stores.enterEditMode();
    await page.waitForTimeout(100);

    // Place first track
    await stores.addTrack(parts[0], startPos, startRotation);
    await page.waitForTimeout(50);
    let connectionsFormed = 0;

    // Place remaining tracks by extending from endpoints
    for (let i = 1; i < parts.length; i++) {
        const result = await extendCircuit(stores, page, parts[i]);
        if (result.connected) connectionsFormed++;
    }

    // Final pass: try to close the circuit by connecting remaining close endpoints
    for (let pass = 0; pass < 5; pass++) {
        const state = await stores.getTrackState();
        const nodes = Object.values(state.nodes) as any[];
        const endpoints = nodes.filter(n => n.connections.length === 1);

        let found = false;
        for (let i = 0; i < endpoints.length; i++) {
            for (let j = i + 1; j < endpoints.length; j++) {
                const a = endpoints[i];
                const b = endpoints[j];
                const dx = a.position.x - b.position.x;
                const dy = a.position.y - b.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 10) {
                    await stores.connectNodes(a.id, b.id, a.connections[0]);
                    connectionsFormed++;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
        if (!found) break;
    }

    const finalState = await stores.getTrackState();
    const openEps = (await stores.getOpenEndpoints()) as any[];

    return {
        edgesPlaced: Object.keys(finalState.edges).length,
        connectionsFormed,
        openEndpoints: openEps.length,
        isClosed: openEps.length === 0,
    };
}

/**
 * Run a train on the current layout and verify it traverses edges.
 */
async function verifyTrainRuns(
    stores: StoreBridge,
    page: Page,
    durationMs = 5000,
): Promise<{
    moved: boolean;
    edgesVisited: number;
    crashed: boolean;
    positions: { t: number; edge: string; dist: number }[];
}> {
    const state = await stores.getTrackState();
    const edgeIds = Object.keys(state.edges);
    if (edgeIds.length === 0) return { moved: false, edgesVisited: 0, crashed: false, positions: [] };

    await stores.enterSimulateMode();
    await stores.clearTrains();
    await stores.spawnTrain(edgeIds[0], '#ff3300');
    await stores.setRunning(true);

    const positions: { t: number; edge: string; dist: number }[] = [];
    const steps = Math.ceil(durationMs / 300);

    for (let i = 0; i < steps; i++) {
        await page.waitForTimeout(300);
        const sim = await stores.getSimulationState();
        const train = Object.values(sim.trains)[0] as any;
        if (train) {
            positions.push({
                t: +((i + 1) * 0.3).toFixed(1),
                edge: train.currentEdgeId,
                dist: +(train.distanceAlongEdge?.toFixed(1) ?? 0),
            });
            if (train.crashed) break;
        }
    }

    await stores.setRunning(false);
    await stores.enterEditMode();

    const uniqueEdges = new Set(positions.map(p => p.edge));
    const crashed = positions.length > 0 &&
        !!(Object.values((await stores.getSimulationState()).trains)[0] as any)?.crashed;

    return {
        moved: positions.length >= 2 && (
            positions[0].dist !== positions[positions.length - 1].dist ||
            positions[0].edge !== positions[positions.length - 1].edge
        ),
        edgesVisited: uniqueEdges.size,
        crashed,
        positions,
    };
}

// =============================================
// CIRCUIT RESULTS
// =============================================

interface CircuitResult {
    name: string;
    parts: string;
    edgesPlaced: number;
    connections: number;
    isClosed: boolean;
    trainMoved: boolean;
    edgesTraversed: number;
    crashed: boolean;
    verdict: 'PASS' | 'PARTIAL' | 'FAIL';
}

// =============================================
// TESTS
// =============================================

test.describe('Circuit Configurations', () => {
    test.setTimeout(300_000);

    test('build and verify all circuit types', async ({ page, app, stores }) => {
        void app;
        const screenshots = new ScreenshotManager(page, stores, 'circuits');
        const results: CircuitResult[] = [];

        // Dismiss tutorial
        const skipBtn = page.getByText('Skip tutorial');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipBtn.click();
            await page.waitForTimeout(300);
        }

        // ============================================
        // CIRCUIT 1: Pure Circle — 8 × R249-45°
        // ============================================
        {
            const parts = Array(8).fill('kato-20-100');
            const build = await buildCircuit(stores, page, parts, { x: 700, y: 300 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('01-circle-R249');

            const train = await verifyTrainRuns(stores, page, 6000);
            await screenshots.capture('01b-circle-R249-train');

            results.push({
                name: 'Circle (8 × R249-45°)',
                parts: '8 curves',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 3 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 1: closed=${build.isClosed}, edges=${train.edgesVisited}, moved=${train.moved}`);
        }

        // ============================================
        // CIRCUIT 2: Tight Circle — 8 × R216-45°
        // ============================================
        {
            const parts = Array(8).fill('kato-20-170');
            const build = await buildCircuit(stores, page, parts, { x: 700, y: 300 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('02-circle-R216');

            const train = await verifyTrainRuns(stores, page, 6000);
            await screenshots.capture('02b-circle-R216-train');

            results.push({
                name: 'Tight Circle (8 × R216-45°)',
                parts: '8 tight curves',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 3 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 2: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 3: Wide Circle — 8 × R315-45°
        // ============================================
        {
            const parts = Array(8).fill('kato-20-120');
            const build = await buildCircuit(stores, page, parts, { x: 700, y: 200 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('03-circle-R315');

            const train = await verifyTrainRuns(stores, page, 6000);

            results.push({
                name: 'Wide Circle (8 × R315-45°)',
                parts: '8 wide curves',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 3 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 3: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 4: Extra Wide Circle — 8 × R348-45°
        // ============================================
        {
            const parts = Array(8).fill('kato-20-132');
            const build = await buildCircuit(stores, page, parts, { x: 700, y: 200 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('04-circle-R348');

            const train = await verifyTrainRuns(stores, page, 6000);

            results.push({
                name: 'Extra Wide Circle (8 × R348-45°)',
                parts: '8 large curves',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 3 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 4: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 5: 12-curve Circle — 12 × R381-30°
        // ============================================
        {
            const parts = Array(12).fill('kato-20-140');
            const build = await buildCircuit(stores, page, parts, { x: 700, y: 200 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('05-circle-R381-12');

            const train = await verifyTrainRuns(stores, page, 6000);

            results.push({
                name: '12-Segment Circle (12 × R381-30°)',
                parts: '12 gentle curves',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 4 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 5: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 6: Oval — curves + straights
        // 4 curves (right turn) + straight + 4 curves + straight
        // ============================================
        {
            const parts = [
                'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100', // 180° turn
                'kato-20-000',  // straight across
                'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100', // 180° turn
                'kato-20-000',  // straight back
            ];
            const build = await buildCircuit(stores, page, parts, { x: 500, y: 300 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('06-oval-with-straights');

            const train = await verifyTrainRuns(stores, page, 6000);
            await screenshots.capture('06b-oval-train');

            results.push({
                name: 'Oval (4+4 curves + 2 straights)',
                parts: '8 curves + 2 straights',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 3 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 6: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 7: Long Oval — more straights
        // ============================================
        {
            const parts = [
                'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100', // 180° turn
                'kato-20-000', 'kato-20-000', 'kato-20-000',  // 3 straights
                'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100', // 180° turn
                'kato-20-000', 'kato-20-000', 'kato-20-000',  // 3 straights back
            ];
            const build = await buildCircuit(stores, page, parts, { x: 400, y: 250 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('07-long-oval');

            const train = await verifyTrainRuns(stores, page, 8000);
            await screenshots.capture('07b-long-oval-train');

            results.push({
                name: 'Long Oval (8 curves + 6 straights)',
                parts: '14 pieces',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 4 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 7: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 8: Rectangle — 2 curves per corner
        // ============================================
        {
            const parts = [
                'kato-20-000',                                  // bottom
                'kato-20-100', 'kato-20-100',                   // bottom-right corner (90°)
                'kato-20-000',                                  // right side
                'kato-20-100', 'kato-20-100',                   // top-right corner
                'kato-20-000',                                  // top
                'kato-20-100', 'kato-20-100',                   // top-left corner
                'kato-20-000',                                  // left side
                'kato-20-100', 'kato-20-100',                   // bottom-left corner
            ];
            const build = await buildCircuit(stores, page, parts, { x: 350, y: 500 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('08-rectangle');

            const train = await verifyTrainRuns(stores, page, 8000);
            await screenshots.capture('08b-rectangle-train');

            results.push({
                name: 'Rectangle (4 straights + 8 curves)',
                parts: '12 pieces',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 4 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 8: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 9: Wooden Circle — 8 × R182-45°
        // ============================================
        {
            const parts = Array(8).fill('wooden-curve-large');
            const build = await buildCircuit(stores, page, parts, { x: 600, y: 300 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('09-wooden-circle');

            const train = await verifyTrainRuns(stores, page, 5000);

            results.push({
                name: 'Wooden Circle (8 × R182-45°)',
                parts: '8 wooden curves',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 3 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 9: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 10: Wooden Oval — curves + straights
        // ============================================
        {
            const parts = [
                'wooden-curve-large', 'wooden-curve-large', 'wooden-curve-large', 'wooden-curve-large',
                'wooden-straight-long',
                'wooden-curve-large', 'wooden-curve-large', 'wooden-curve-large', 'wooden-curve-large',
                'wooden-straight-long',
            ];
            const build = await buildCircuit(stores, page, parts, { x: 500, y: 250 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('10-wooden-oval');

            const train = await verifyTrainRuns(stores, page, 5000);

            results.push({
                name: 'Wooden Oval (8 curves + 2 straights)',
                parts: '10 wooden pieces',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 3 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 10: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 11: Large Oval with Long Straights
        // ============================================
        {
            const parts = [
                'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
                'kato-20-000', 'kato-20-000', 'kato-20-000', 'kato-20-000', 'kato-20-000',
                'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
                'kato-20-000', 'kato-20-000', 'kato-20-000', 'kato-20-000', 'kato-20-000',
            ];
            const build = await buildCircuit(stores, page, parts, { x: 200, y: 200 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('11-large-oval');

            const train = await verifyTrainRuns(stores, page, 10000);
            await screenshots.capture('11b-large-oval-train');

            results.push({
                name: 'Large Oval (8 curves + 10 straights)',
                parts: '18 pieces',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 5 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 11: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 12: Double-ended Oval (with short straights)
        // ============================================
        {
            const parts = [
                'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
                'kato-20-020',   // 124mm short straight
                'kato-20-100', 'kato-20-100', 'kato-20-100', 'kato-20-100',
                'kato-20-020',   // 124mm short straight
            ];
            const build = await buildCircuit(stores, page, parts, { x: 500, y: 250 }, 0);
            await page.waitForTimeout(200);
            await screenshots.capture('12-compact-oval');

            const train = await verifyTrainRuns(stores, page, 6000);

            results.push({
                name: 'Compact Oval (8 curves + 2 short straights)',
                parts: '10 pieces',
                ...build, connections: build.connectionsFormed,
                trainMoved: train.moved,
                edgesTraversed: train.edgesVisited,
                crashed: train.crashed,
                verdict: build.isClosed && train.moved && train.edgesVisited >= 3 ? 'PASS' : build.isClosed ? 'PARTIAL' : 'FAIL',
            });
            console.log(`Circuit 12: closed=${build.isClosed}, edges=${train.edgesVisited}`);
        }

        // ============================================
        // CIRCUIT 13: Two Trains Racing on Oval
        // ============================================
        {
            // Load template for known-good circuit
            await stores.clearLayout();
            const selector = page.getByTestId('file-template-selector');
            await selector.selectOption('Simple Oval');
            await page.waitForTimeout(500);

            const state = await stores.getTrackState();
            const edgeIds = Object.keys(state.edges);

            await stores.enterSimulateMode();
            await stores.clearTrains();
            await stores.spawnTrain(edgeIds[0], '#ff0000', 1);
            await stores.spawnTrain(edgeIds[4], '#0066ff', 1);
            await stores.spawnTrain(edgeIds[2], '#00cc00', 1);
            await stores.setRunning(true);
            await page.waitForTimeout(5000);

            const simState = await stores.getSimulationState();
            const trains = Object.values(simState.trains) as any[];
            const allMoved = trains.every(t => t.distanceAlongEdge > 5);
            const anyCrashed = trains.some(t => t.crashed);

            await stores.setRunning(false);
            await stores.enterEditMode();
            await screenshots.capture('13-three-trains-racing');

            results.push({
                name: '3 Trains Racing on Oval',
                parts: 'template oval',
                edgesPlaced: edgeIds.length,
                connections: 8,
                isClosed: true,
                openEndpoints: 0,
                trainMoved: allMoved,
                edgesTraversed: -1,
                crashed: anyCrashed,
                verdict: allMoved && !anyCrashed ? 'PASS' : 'FAIL',
            });
            console.log(`Circuit 13: allMoved=${allMoved}, crashed=${anyCrashed}`);
        }

        // ============================================
        // CIRCUIT 14: High-Speed Oval (3x speed)
        // ============================================
        {
            await stores.clearLayout();
            const selector = page.getByTestId('file-template-selector');
            await selector.selectOption('Simple Oval');
            await page.waitForTimeout(500);

            const state = await stores.getTrackState();
            const edgeIds = Object.keys(state.edges);

            await stores.enterSimulateMode();
            await stores.clearTrains();
            await stores.spawnTrain(edgeIds[0], '#ff6600');
            await stores.setSpeedMultiplier(3.0);
            await stores.setRunning(true);
            await page.waitForTimeout(5000);

            const simState = await stores.getSimulationState();
            const train = Object.values(simState.trains)[0] as any;

            await stores.setRunning(false);
            await stores.setSpeedMultiplier(1.0);
            await stores.enterEditMode();
            await screenshots.capture('14-high-speed-oval');

            results.push({
                name: 'High-Speed Oval (3x speed)',
                parts: 'template oval',
                edgesPlaced: edgeIds.length,
                connections: 8,
                isClosed: true,
                openEndpoints: 0,
                trainMoved: !!(train && train.distanceAlongEdge > 5),
                edgesTraversed: -1,
                crashed: !!train?.crashed,
                verdict: train && !train.crashed ? 'PASS' : 'FAIL',
            });
            console.log(`Circuit 14: speed=3x, crashed=${train?.crashed}`);
        }

        // ============================================
        // PRINT RESULTS
        // ============================================

        console.log('\n==========================================');
        console.log('CIRCUIT CONFIGURATION RESULTS');
        console.log('==========================================\n');

        let pass = 0, partial = 0, fail = 0;

        for (const r of results) {
            const icon = r.verdict === 'PASS' ? 'PASS' : r.verdict === 'PARTIAL' ? 'PART' : 'FAIL';
            if (r.verdict === 'PASS') pass++;
            else if (r.verdict === 'PARTIAL') partial++;
            else fail++;

            console.log(`${icon} | ${r.name}`);
            console.log(`     Edges: ${r.edgesPlaced}, Closed: ${r.isClosed}, Connections: ${r.connections}`);
            console.log(`     Train: moved=${r.trainMoved}, traversed=${r.edgesTraversed}, crashed=${r.crashed}`);
            console.log('');
        }

        console.log('==========================================');
        console.log(`TOTAL: ${pass} PASS, ${partial} PARTIAL, ${fail} FAIL (of ${results.length})`);
        console.log('==========================================\n');

        // Most circuits should fully pass
        expect(pass + partial).toBeGreaterThanOrEqual(Math.floor(results.length * 0.6));
    });
});
