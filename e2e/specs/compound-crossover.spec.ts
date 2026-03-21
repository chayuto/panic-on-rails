/**
 * Compound Crossover E2E Test
 *
 * Tests the compound geometry system end-to-end:
 * 1. Place a compound crossover via addTrack
 * 2. Verify correct node/edge counts
 * 3. Verify switch nodes exist with proper routing
 * 4. Connect straight tracks to external connectors
 * 5. Spawn trains and run simulation
 * 6. Verify trains traverse edges and event log is functional
 * 7. Verify cascade deletion removes all compound edges
 */

import { test, expect } from '../fixtures/app-fixture';

test('Compound crossover: place, connect, and simulate', async ({ page, stores, snap }) => {
    // Clear any existing layout via the bridge action (not getState())
    await page.evaluate(() => {
        window.__PANIC_STORES__!.track.clearLayout();
        window.__PANIC_STORES__!.simulation.clearTrains();
    });

    // Place a compound crossover (kato-20-230) at center
    const result = await page.evaluate(() => {
        const track = window.__PANIC_STORES__!.track;
        const edgeId = track.addTrack('kato-20-230', { x: 500, y: 300 }, 0);
        const state = track.getState();
        return {
            edgeId,
            nodeCount: Object.keys(state.nodes).length,
            edgeCount: Object.keys(state.edges).length,
            nodes: Object.values(state.nodes).map((n: any) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                connectionCount: n.connections.length,
                hasSwitchBranches: !!n.switchBranches,
            })),
            edges: Object.values(state.edges).map((e: any) => ({
                id: e.id,
                partId: e.partId,
                placementId: e.placementId,
                length: e.length,
                geoType: e.geometry.type,
            })),
        };
    });

    console.log('\n=== Compound Crossover Placement ===');
    console.log(`  Edge ID: ${result.edgeId}`);
    console.log(`  Nodes: ${result.nodeCount}, Edges: ${result.edgeCount}`);

    // 2 turnouts (3 nodes + 2 edges each) - 1 fused joint = 5 nodes, 4 edges
    expect(result.nodeCount).toBe(5);
    expect(result.edgeCount).toBe(4);

    // All edges should have the compound partId
    for (const edge of result.edges) {
        expect(edge.partId).toBe('kato-20-230');
    }

    // All edges should share the same placementId
    const placementIds = new Set(result.edges.map(e => e.placementId));
    expect(placementIds.size).toBe(1);

    // 2 switch nodes (entry nodes of the two turnouts)
    const switchNodes = result.nodes.filter(n => n.type === 'switch');
    expect(switchNodes.length).toBe(2);
    for (const sw of switchNodes) {
        expect(sw.hasSwitchBranches).toBe(true);
    }

    // Log edge details
    for (const edge of result.edges) {
        console.log(`  Edge ${edge.id.slice(0, 8)}: ${edge.geoType}, len=${edge.length.toFixed(1)}`);
    }

    await snap('compound-placed');

    // Place straight tracks adjacent to the compound for a runnable layout
    await page.evaluate(() => {
        const track = window.__PANIC_STORES__!.track;
        // Extend upper track in both directions
        track.addTrack('kato-20-000', { x: 500 - 248, y: 300 }, 0);
        track.addTrack('kato-20-000', { x: 500 + 126, y: 300 }, 0);
    });

    const afterStraights = await page.evaluate(() => {
        const state = window.__PANIC_STORES__!.track.getState();
        return {
            nodeCount: Object.keys(state.nodes).length,
            edgeCount: Object.keys(state.edges).length,
        };
    });

    console.log(`  After adding straights: ${afterStraights.nodeCount} nodes, ${afterStraights.edgeCount} edges`);
    await snap('compound-with-straights');

    // Spawn a train on the first compound edge
    const trainResult = await page.evaluate(() => {
        const sim = window.__PANIC_STORES__!.simulation;
        const state = window.__PANIC_STORES__!.track.getState();
        const edges = Object.values(state.edges) as any[];
        const compoundEdge = edges.find((e: any) => e.partId === 'kato-20-230');
        if (!compoundEdge) return { trainId: null, edgeId: null };
        const trainId = sim.spawnTrain(compoundEdge.id, '#E53935');
        return { trainId, edgeId: compoundEdge.id };
    });

    expect(trainResult.trainId).toBeTruthy();
    console.log(`  Train spawned: ${trainResult.trainId?.slice(0, 8)} on edge ${trainResult.edgeId?.slice(0, 8)}`);

    // Start simulation
    await page.evaluate(() => {
        window.__PANIC_STORES__!.mode.enterSimulateMode();
        window.__PANIC_STORES__!.simulation.setRunning(true);
    });

    // Wait for simulation to start
    await page.waitForFunction(
        () => window.__PANIC_STORES__?.simulation.getState().isRunning === true,
        { timeout: 3000 },
    );

    // Let simulation run for 3 seconds
    await page.waitForTimeout(3000);

    await snap('compound-simulating');

    // Read the simulation event log
    const log = await page.evaluate(() => {
        const state = window.__PANIC_STORES__!.simulation.getState();
        return {
            events: state.simLog,
            elapsed: state.simElapsed,
            totalEvents: state.simLog.length,
        };
    });

    console.log(`\n=== Compound Simulation Log ===`);
    console.log(`  Elapsed: ${log.elapsed.toFixed(2)}s`);
    console.log(`  Total events: ${log.totalEvents}`);

    // Group events by type
    const byType: Record<string, number> = {};
    for (const evt of log.events) {
        byType[evt.type] = (byType[evt.type] || 0) + 1;
    }
    console.log(`  Event breakdown:`, byType);

    // Print first events
    for (const evt of log.events.slice(0, 15)) {
        console.log(`    [${evt.time.toFixed(3)}s] ${evt.type} train=${evt.trainId.slice(0, 8)} edge=${evt.edgeId.slice(0, 8)} ${evt.detail}`);
    }

    // Should have events (traverse or bounce — train moving across edges)
    expect(log.totalEvents).toBeGreaterThan(0);
    expect(log.elapsed).toBeGreaterThan(0);

    // The train should have bounce events (dead-end straights) or traverse events
    const hasMovement = (byType['traverse'] || 0) + (byType['bounce'] || 0);
    expect(hasMovement).toBeGreaterThan(0);
    console.log(`  Movement events: ${hasMovement} (traverse=${byType['traverse'] || 0}, bounce=${byType['bounce'] || 0})`);

    // Verify train is still active (not crashed)
    const finalSim = await page.evaluate(() => {
        const state = window.__PANIC_STORES__!.simulation.getState();
        return Object.values(state.trains).map((t: any) => ({
            id: t.id,
            crashed: t.crashed,
            speed: t.speed,
            edgeId: t.currentEdgeId,
        }));
    });

    for (const train of finalSim) {
        expect(train.crashed).toBeFalsy();
    }
    console.log(`  Train healthy: speed=${finalSim[0]?.speed}, edge=${finalSim[0]?.edgeId?.slice(0, 8)}`);

    await snap('compound-final');

    // Test cascade deletion: remove one compound edge, all should go
    await page.evaluate(() => {
        window.__PANIC_STORES__!.simulation.setRunning(false);
        const state = window.__PANIC_STORES__!.track.getState();
        const edges = Object.values(state.edges) as any[];
        const compoundEdge = edges.find((e: any) => e.partId === 'kato-20-230');
        if (compoundEdge) {
            window.__PANIC_STORES__!.track.removeTrack(compoundEdge.id);
        }
    });

    const afterDelete = await page.evaluate(() => {
        const state = window.__PANIC_STORES__!.track.getState();
        const edges = Object.values(state.edges) as any[];
        return {
            compoundEdgesRemaining: edges.filter((e: any) => e.partId === 'kato-20-230').length,
            totalEdges: Object.keys(state.edges).length,
            totalNodes: Object.keys(state.nodes).length,
        };
    });

    console.log(`\n=== Cascade Deletion ===`);
    console.log(`  Compound edges remaining: ${afterDelete.compoundEdgesRemaining}`);
    console.log(`  Total edges: ${afterDelete.totalEdges}, nodes: ${afterDelete.totalNodes}`);

    // All compound edges should be gone
    expect(afterDelete.compoundEdgesRemaining).toBe(0);
    // Only the straight tracks should remain (2 straights = 2 edges)
    expect(afterDelete.totalEdges).toBe(2);

    console.log('  PASS: Compound crossover fully functional\n');
});
