/**
 * Headless simulation harness.
 *
 * Builds a layout, spawns trains, and steps the simulation through the real
 * stores without React, Konva, rAF or a browser. Used by Vitest scenario
 * tests and exposed on the debug bridge as `window.__PANIC_SIM__` so agents
 * can drive the exact same code path in a live page.
 *
 * @example
 * resetWorld();
 * loadRecipe(simpleOval);             // any TrackTemplate JSON
 * seedSimulation(42);
 * const events = runSimulation(600);  // 10 s at 60 fps
 * expect(summarize().crashed).toBe(0);
 */

import { useTrackStore } from '../stores/useTrackStore';
import { useLogicStore } from '../stores/useLogicStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { applyTemplate } from '../data/templates';
import type { TrackTemplate } from '../data/templates/types';
import type { EdgeId, TrainId } from '../types';
import { readWorld, runSimulation, seedSimulation, tickSimulation } from './tick';

/** Clear trains, debris, errors and the event log (layout is kept). */
export function resetTrains(): void {
    const sim = useSimulationStore.getState();
    sim.setRunning(false);
    sim.clearTrains();
    sim.clearDebris();
    sim.clearLog();
    sim.clearError();
}

/** Clear everything: layout, logic, trains. Also resets the RNG seed. */
export function resetWorld(): void {
    resetTrains();
    useTrackStore.getState().clearLayout();
    useLogicStore.getState().clearLogic();
    seedSimulation(null);
}

/**
 * Build a template recipe through the real `addTrack()` pipeline and spawn
 * its trains, without auto-starting. Returns the primary edge of each part
 * (same indices as `template.parts`; null where placement failed).
 */
export function loadRecipe(template: TrackTemplate): (EdgeId | null)[] {
    resetTrains();
    const track = useTrackStore.getState();
    const edgeIds: (EdgeId | null)[] = [];
    applyTemplate(
        template,
        track.clearLayout,
        (partId, position, rotation) => {
            const id = useTrackStore.getState().addTrack(partId, position, rotation);
            edgeIds.push(id);
            return id;
        },
        () => useTrackStore.getState().nodes,
        (survivor, removed, edge) => useTrackStore.getState().connectNodes(survivor, removed, edge),
        (edgeId, color) => useSimulationStore.getState().spawnTrain(edgeId, color),
        () => { /* headless: caller steps explicitly */ },
        false
    );
    return edgeIds;
}

export interface TrainSummary {
    id: TrainId;
    edgeId: EdgeId;
    partId: string;
    distance: number;
    direction: 1 | -1;
    crashed: boolean;
}

export interface SimSummary {
    elapsed: number;
    trains: TrainSummary[];
    crashed: number;
    debris: number;
    edges: number;
    nodes: number;
}

/** A compact, JSON-friendly snapshot of the simulation for assertions and agents. */
export function summarize(): SimSummary {
    const world = readWorld();
    const trains = Object.values(world.trains).map(t => ({
        id: t.id,
        edgeId: t.currentEdgeId,
        partId: world.edges[t.currentEdgeId]?.partId ?? '?',
        distance: Math.round(t.distanceAlongEdge * 100) / 100,
        direction: t.direction,
        crashed: !!t.crashed,
    }));
    return {
        elapsed: Math.round(useSimulationStore.getState().simElapsed * 1000) / 1000,
        trains,
        crashed: trains.filter(t => t.crashed).length,
        debris: world.crashedParts.length,
        edges: Object.keys(world.edges).length,
        nodes: Object.keys(world.nodes).length,
    };
}

/** Everything an agent needs, in one object. Attached to `window.__PANIC_SIM__`. */
export const simHarness = {
    resetWorld,
    resetTrains,
    loadRecipe,
    seed: seedSimulation,
    /** Advance one tick of `dt` seconds (default one 60 fps frame). */
    tick: (dt = 1 / 60) => tickSimulation(dt),
    /** Advance `frames` fixed ticks (default 60 fps). Returns the events. */
    run: (frames: number, frameDt = 1 / 60) => runSimulation(frames, frameDt),
    /** Advance by simulated seconds at 60 fps. Returns the events. */
    runSeconds: (seconds: number) => runSimulation(Math.round(seconds * 60)),
    summarize,
};

export type SimHarness = typeof simHarness;
