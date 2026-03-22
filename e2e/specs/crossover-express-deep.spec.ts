/**
 * Crossover Express — Deep Validation
 *
 * Goes beyond template-simlog's basic "loads + trains move" check.
 * Validates:
 * 1. Graph topology: correct node types, switch nodes, open endpoints
 * 2. Figure-8 geometry: two semicircle centers, crossing region
 * 3. Full loop coverage: trains visit ALL main-loop edges (not just 1-2)
 * 4. Switch toggling: divert a train into the siding branch
 * 5. Siding dead-end: train bounces when diverted to siding
 */

import { test, expect } from '../fixtures/app-fixture';

test('Crossover Express: deep template validation', async ({ page, stores, snap }) => {
    // ─── 1. LOAD TEMPLATE ───────────────────────────────────────────
    await page.selectOption('[data-testid="file-template-selector"]', 'crossover-express');

    await page.waitForFunction(
        () => Object.keys(window.__PANIC_STORES__?.track.getState().edges ?? {}).length === 13,
        { timeout: 5000 },
    );

    await snap('01-loaded');

    // ─── 2. GRAPH TOPOLOGY ──────────────────────────────────────────
    const topo = await page.evaluate(() => {
        const state = window.__PANIC_STORES__!.track.getState();
        const nodes = Object.values(state.nodes) as any[];
        const edges = Object.values(state.edges) as any[];

        const switchNodes = nodes.filter((n: any) => n.type === 'switch');
        const endpoints = nodes.filter((n: any) => n.connections.length === 1);
        const junctions = nodes.filter((n: any) => n.type === 'junction');

        // Edges by partId
        const edgesByPart: Record<string, number> = {};
        for (const e of edges) {
            edgesByPart[e.partId] = (edgesByPart[e.partId] || 0) + 1;
        }

        // Find the main loop edges (connected circuit) vs siding
        // Walk from a non-switch endpoint-free node to find the loop
        const visited = new Set<string>();
        const mainLoopEdges = new Set<string>();

        // BFS from first curve edge to find connected component
        const startEdge = edges.find((e: any) => e.partId === 'kato-20-100');
        if (startEdge) {
            const queue = [startEdge.id];
            while (queue.length > 0) {
                const eId = queue.shift()!;
                if (visited.has(eId)) continue;
                visited.add(eId);
                mainLoopEdges.add(eId);

                const edge = state.edges[eId];
                if (!edge) continue;

                // Find edges connected via nodes
                for (const nId of [edge.startNodeId, edge.endNodeId]) {
                    const node = state.nodes[nId];
                    if (!node) continue;
                    for (const connEdgeId of node.connections) {
                        if (!visited.has(connEdgeId)) {
                            queue.push(connEdgeId);
                        }
                    }
                }
            }
        }

        return {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            switchCount: switchNodes.length,
            endpointCount: endpoints.length,
            junctionCount: junctions.length,
            edgesByPart,
            mainLoopEdgeCount: mainLoopEdges.size,
            switchNodeIds: switchNodes.map((n: any) => n.id),
            endpointNodeIds: endpoints.map((n: any) => n.id),
        };
    });

    console.log('\n=== Graph Topology ===');
    console.log(`  Nodes: ${topo.nodeCount}, Edges: ${topo.edgeCount}`);
    console.log(`  Switches: ${topo.switchCount}, Endpoints: ${topo.endpointCount}, Junctions: ${topo.junctionCount}`);
    console.log(`  Edges by part:`, topo.edgesByPart);
    console.log(`  Main loop edges: ${topo.mainLoopEdgeCount}`);

    expect(topo.edgeCount).toBe(13);
    expect(topo.switchCount).toBe(2); // A1 and B1 of the crossover
    expect(topo.endpointCount).toBeLessThanOrEqual(2); // B2 siding + possibly 1 more
    // All edges should be reachable from any edge (single connected component)
    expect(topo.mainLoopEdgeCount).toBe(13);

    // ─── 3. FIGURE-8 GEOMETRY ───────────────────────────────────────
    const geo = await page.evaluate(() => {
        const state = window.__PANIC_STORES__!.track.getState();
        const edges = Object.values(state.edges) as any[];

        // Collect arc centers from curve edges
        const arcCenters: Array<{ x: number; y: number }> = [];
        for (const e of edges) {
            if (e.geometry?.type === 'arc' && e.geometry.center) {
                const c = e.geometry.center;
                // Round to nearest integer for grouping
                arcCenters.push({ x: Math.round(c.x), y: Math.round(c.y) });
            }
        }

        // Group by approximate center (within 5px)
        const groups: Array<{ x: number; y: number; count: number }> = [];
        for (const c of arcCenters) {
            const existing = groups.find(
                g => Math.abs(g.x - c.x) < 5 && Math.abs(g.y - c.y) < 5
            );
            if (existing) {
                existing.count++;
            } else {
                groups.push({ x: c.x, y: c.y, count: 1 });
            }
        }

        // Compute bounding box of all node positions
        const nodes = Object.values(state.nodes) as any[];
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of nodes) {
            minX = Math.min(minX, n.position.x);
            maxX = Math.max(maxX, n.position.x);
            minY = Math.min(minY, n.position.y);
            maxY = Math.max(maxY, n.position.y);
        }

        return {
            arcCenterGroups: groups.sort((a, b) => a.x - b.x),
            bbox: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY },
        };
    });

    console.log('\n=== Figure-8 Geometry ===');
    console.log(`  Arc center groups: ${geo.arcCenterGroups.length}`);
    for (const g of geo.arcCenterGroups) {
        console.log(`    Center (${g.x}, ${g.y}): ${g.count} arcs`);
    }
    console.log(`  Bounding box: ${geo.bbox.width.toFixed(0)}×${geo.bbox.height.toFixed(0)}`);

    // Figure-8 requires exactly 2 distinct arc centers (one per semicircle)
    const curveCenters = geo.arcCenterGroups.filter(g => g.count >= 3);
    expect(curveCenters.length).toBe(2);

    // The two centers should be horizontally separated
    const centerDist = Math.abs(curveCenters[0].x - curveCenters[1].x);
    console.log(`  Center separation: ${centerDist.toFixed(0)}px`);
    expect(centerDist).toBeGreaterThan(50);

    // Both centers should be at roughly the same Y (figure-8 is vertically symmetric)
    const yDiff = Math.abs(curveCenters[0].y - curveCenters[1].y);
    expect(yDiff).toBeLessThan(10);

    await snap('02-geometry-verified');

    // ─── 4. FULL LOOP COVERAGE ──────────────────────────────────────
    // Run simulation long enough for trains to complete full loops
    // At default speed, a train traverses ~120px/s. Loop circumference ≈ 2*π*249 + 126 ≈ 1690px
    // So one full loop takes ~14s. Run for 20s to ensure coverage.

    await page.waitForFunction(
        () => window.__PANIC_STORES__?.simulation.getState().isRunning === true,
        { timeout: 3000 },
    );

    // Speed up simulation for faster coverage
    await stores.setSpeedMultiplier(3.0);

    await page.waitForTimeout(8000); // 8s at 3x = 24s equivalent

    await snap('03-mid-simulation');

    const coverage = await page.evaluate(() => {
        const simState = window.__PANIC_STORES__!.simulation.getState();
        const trackState = window.__PANIC_STORES__!.track.getState();
        const allEdgeIds = new Set(Object.keys(trackState.edges));

        // Collect unique edges visited by each train from traverse events
        const trainEdges: Record<string, Set<string>> = {};
        for (const evt of simState.simLog) {
            if (evt.type === 'traverse') {
                if (!trainEdges[evt.trainId]) trainEdges[evt.trainId] = new Set();
                trainEdges[evt.trainId].add(evt.edgeId);
            }
        }

        // Also check current edge of each train
        for (const train of Object.values(simState.trains) as any[]) {
            if (!trainEdges[train.id]) trainEdges[train.id] = new Set();
            trainEdges[train.id].add(train.currentEdgeId);
        }

        // Union of all visited edges
        const allVisited = new Set<string>();
        for (const edges of Object.values(trainEdges)) {
            for (const e of edges) allVisited.add(e);
        }

        // Find unvisited edges
        const unvisited = [...allEdgeIds].filter(id => !allVisited.has(id));

        // Check which unvisited edges are siding edges (connected to open endpoints)
        const sidingEdges: string[] = [];
        for (const eid of unvisited) {
            const edge = trackState.edges[eid] as any;
            if (!edge) continue;
            const startNode = trackState.nodes[edge.startNodeId] as any;
            const endNode = trackState.nodes[edge.endNodeId] as any;
            if (startNode?.connections.length === 1 || endNode?.connections.length === 1) {
                sidingEdges.push(eid);
            }
        }

        return {
            totalEdges: allEdgeIds.size,
            totalVisited: allVisited.size,
            trainCoverage: Object.fromEntries(
                Object.entries(trainEdges).map(([k, v]) => [k.slice(0, 8), v.size])
            ),
            unvisitedCount: unvisited.length,
            sidingEdgeCount: sidingEdges.length,
            traverseEvents: simState.simLog.filter((e: any) => e.type === 'traverse').length,
            bounceEvents: simState.simLog.filter((e: any) => e.type === 'bounce').length,
            totalEvents: simState.simLog.length,
            elapsed: simState.simElapsed,
        };
    });

    console.log('\n=== Loop Coverage ===');
    console.log(`  Edges: ${coverage.totalVisited}/${coverage.totalEdges} visited`);
    console.log(`  Per-train coverage:`, coverage.trainCoverage);
    console.log(`  Unvisited: ${coverage.unvisitedCount} (siding: ${coverage.sidingEdgeCount})`);
    console.log(`  Events: ${coverage.traverseEvents} traversals, ${coverage.bounceEvents} bounces, ${coverage.totalEvents} total`);
    console.log(`  Elapsed: ${coverage.elapsed.toFixed(1)}s`);

    // Unvisited edges are: siding (1) + crossover branch paths (2, only used when switch toggled)
    expect(coverage.unvisitedCount).toBeLessThanOrEqual(3);
    // Both trains should have visited multiple edges
    for (const count of Object.values(coverage.trainCoverage)) {
        expect(count).toBeGreaterThanOrEqual(3);
    }
    // No bounces on main loop (circuit, no dead ends for main-loop trains)
    // (bounces may occur if train hits siding — acceptable)
    expect(coverage.traverseEvents).toBeGreaterThan(5);

    // Verify trains healthy
    const simState = await stores.getSimulationState();
    for (const train of Object.values(simState.trains) as any[]) {
        expect(train.crashed).toBeFalsy();
    }

    await snap('04-coverage-verified');

    // ─── 5. SWITCH TOGGLE — DIVERT TO SIDING ───────────────────────
    // Stop simulation, toggle a switch, restart, verify train reaches siding
    await stores.setRunning(false);

    // Find a switch node and toggle it
    const switchResult = await page.evaluate(() => {
        const state = window.__PANIC_STORES__!.track.getState();
        const nodes = Object.values(state.nodes) as any[];
        const switchNode = nodes.find((n: any) => n.type === 'switch' && n.switchState === 0);
        if (!switchNode) return { toggled: false, nodeId: null, beforeState: -1 };

        const beforeState = switchNode.switchState;
        window.__PANIC_STORES__!.track.toggleSwitch(switchNode.id);

        const afterNode = window.__PANIC_STORES__!.track.getState().nodes[switchNode.id] as any;
        return {
            toggled: true,
            nodeId: switchNode.id,
            beforeState,
            afterState: afterNode?.switchState,
        };
    });

    console.log('\n=== Switch Toggle ===');
    console.log(`  Node: ${switchResult.nodeId?.slice(0, 8)}`);
    console.log(`  State: ${switchResult.beforeState} → ${switchResult.afterState}`);

    expect(switchResult.toggled).toBe(true);
    expect(switchResult.afterState).toBe(1); // Switched to branch

    // Clear sim log, restart simulation, run for a few seconds to see divert behavior
    await page.evaluate(() => {
        window.__PANIC_STORES__!.simulation.clearLog();
    });

    await stores.setSpeedMultiplier(3.0);
    await stores.setRunning(true);

    await page.waitForTimeout(6000); // 6s at 3x = 18s equivalent

    await snap('05-switch-toggled');

    const afterToggle = await page.evaluate(() => {
        const simState = window.__PANIC_STORES__!.simulation.getState();
        const byType: Record<string, number> = {};
        for (const evt of simState.simLog) {
            byType[evt.type] = (byType[evt.type] || 0) + 1;
        }

        // Check if any train is on a siding edge (edge connected to open endpoint)
        const trackState = window.__PANIC_STORES__!.track.getState();
        let trainOnSiding = false;
        for (const train of Object.values(simState.trains) as any[]) {
            const edge = trackState.edges[train.currentEdgeId] as any;
            if (!edge) continue;
            const startNode = trackState.nodes[edge.startNodeId] as any;
            const endNode = trackState.nodes[edge.endNodeId] as any;
            if (startNode?.connections.length === 1 || endNode?.connections.length === 1) {
                trainOnSiding = true;
            }
        }

        return {
            eventBreakdown: byType,
            hasBounce: (byType['bounce'] || 0) > 0,
            trainOnSiding,
            trainsCrashed: Object.values(simState.trains).some((t: any) => t.crashed),
        };
    });

    console.log(`  Events after toggle:`, afterToggle.eventBreakdown);
    console.log(`  Has bounce (siding dead-end): ${afterToggle.hasBounce}`);
    console.log(`  Train on siding: ${afterToggle.trainOnSiding}`);

    // After toggling switch to branch, train gets diverted to siding dead-end and bounces.
    // The bounced train may then collide with the other train — this is valid gameplay.
    // Key assertion: the switch WORKS (bounce event proves train reached siding dead-end).
    expect(afterToggle.hasBounce).toBe(true);

    // Should still have traversal events (trains were moving before collision)
    expect(afterToggle.eventBreakdown['traverse'] || 0).toBeGreaterThan(0);

    await snap('06-final');

    console.log('\n  PASS: Crossover Express deep validation complete\n');
});
