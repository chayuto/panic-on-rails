/**
 * Template Loading + Simulation Log Verification
 *
 * For each template:
 * 1. Load it via the template selector
 * 2. Verify correct number of edges were placed
 * 3. Run simulation for a few seconds
 * 4. Read the simulation event log
 * 5. Verify trains traversed edges and the log is functional
 */

import { test, expect } from '../fixtures/app-fixture';

const TEMPLATES = [
    {
        id: 'simple-oval',
        name: 'Simple Oval',
        expectedEdges: 8,
        expectedTrains: 1,
        isCircuit: true,
    },
    {
        id: 'wooden-starter',
        name: 'Wooden Starter',
        expectedEdges: 8,
        expectedTrains: 1,
        isCircuit: true,
    },
    {
        id: 'switch-showdown',
        name: 'Switch Showdown',
        expectedEdges: 4,
        expectedTrains: 2,
        isCircuit: false,
    },
];

for (const tmpl of TEMPLATES) {
    test(`Template "${tmpl.name}": load, simulate, verify log`, async ({ page, stores, snap }) => {
        // Load the template via the select element
        await page.selectOption('[data-testid="file-template-selector"]', tmpl.id);

        // Wait for template to be applied (edges should appear)
        await page.waitForFunction(
            (expected) => {
                const state = window.__PANIC_STORES__?.track.getState();
                return state && Object.keys(state.edges).length === expected;
            },
            tmpl.expectedEdges,
            { timeout: 5000 },
        );

        // Verify edge count
        const edgeCount = await stores.getEdgeCount();
        const nodeCount = await stores.getNodeCount();
        const state = await stores.getTrackState();
        const endpoints = Object.values(state.nodes).filter((n: any) => n.connections.length === 1);
        console.log(`  Edges: ${edgeCount}, Nodes: ${nodeCount}, Endpoints: ${endpoints.length}`);
        if (endpoints.length >= 2) {
            // Show distances between first few endpoints
            for (let i = 0; i < Math.min(endpoints.length, 4); i++) {
                for (let j = i + 1; j < Math.min(endpoints.length, 4); j++) {
                    const a = endpoints[i] as any;
                    const b = endpoints[j] as any;
                    const dist = Math.sqrt((a.position.x - b.position.x)**2 + (a.position.y - b.position.y)**2);
                    if (dist < 20) {
                        console.log(`    NEAR: dist=${dist.toFixed(2)} (${a.position.x.toFixed(1)},${a.position.y.toFixed(1)}) <-> (${b.position.x.toFixed(1)},${b.position.y.toFixed(1)})`);
                    }
                }
            }
        }
        expect(edgeCount).toBe(tmpl.expectedEdges);

        // Capture screenshot after template load
        await snap(`${tmpl.id}-loaded`);

        // Check trains spawned
        const simState = await stores.getSimulationState();
        const trainCount = Object.keys(simState.trains).length;
        expect(trainCount).toBe(tmpl.expectedTrains);

        // Ensure simulation is running (template auto-starts)
        await page.waitForFunction(
            () => window.__PANIC_STORES__?.simulation.getState().isRunning === true,
            { timeout: 3000 },
        );

        // Let simulation run for 3 seconds
        await page.waitForTimeout(3000);

        // Capture screenshot mid-simulation
        await snap(`${tmpl.id}-running`);

        // Read the simulation event log
        const log = await page.evaluate(() => {
            const state = window.__PANIC_STORES__!.simulation.getState();
            return {
                events: state.simLog,
                elapsed: state.simElapsed,
                totalEvents: state.simLog.length,
            };
        });

        console.log(`\n=== ${tmpl.name} Simulation Log ===`);
        console.log(`  Elapsed: ${log.elapsed.toFixed(2)}s`);
        console.log(`  Total events: ${log.totalEvents}`);

        // Group events by type
        const byType: Record<string, number> = {};
        for (const evt of log.events) {
            byType[evt.type] = (byType[evt.type] || 0) + 1;
        }
        console.log(`  Event breakdown:`, byType);

        // Print first 20 events for debugging
        console.log(`  First 20 events:`);
        for (const evt of log.events.slice(0, 20)) {
            console.log(`    [${evt.time.toFixed(3)}s] ${evt.type} train=${evt.trainId} edge=${evt.edgeId.slice(0, 8)} ${evt.detail}`);
        }

        // Assertions
        expect(log.totalEvents).toBeGreaterThan(0);
        expect(log.elapsed).toBeGreaterThan(0);

        if (tmpl.isCircuit) {
            // Circuits should have traversal events (train crosses edges)
            expect(byType['traverse'] || 0).toBeGreaterThan(0);
            console.log(`  Circuit verified: ${byType['traverse']} edge traversals`);
        } else {
            // Linear tracks should have bounce events (dead ends)
            expect(byType['bounce'] || 0).toBeGreaterThan(0);
            console.log(`  Linear verified: ${byType['bounce']} bounces at dead ends`);
        }

        // Verify all trains are still active (not crashed, for circuits)
        const finalSim = await stores.getSimulationState();
        const activeTrns = Object.values(finalSim.trains);
        if (tmpl.isCircuit) {
            for (const t of activeTrns) {
                expect(t.crashed).toBeFalsy();
            }
            console.log(`  All trains healthy on circuit`);
        }

        // Final screenshot
        await snap(`${tmpl.id}-final`);

        console.log(`  PASS: ${tmpl.name} is fully functional\n`);
    });
}
