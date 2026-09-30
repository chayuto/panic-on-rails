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
 * loadSetPlan('kato-20-852');         // …or a boxed set's layout plan
 * seedSimulation(42);
 * const events = runSimulation(600);  // 10 s at 60 fps
 * expect(summarize().crashed).toBe(0);
 */

import { useTrackStore } from '../stores/useTrackStore';
import { useLogicStore } from '../stores/useLogicStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { applyTemplate } from '../data/templates';
import type { TrackTemplate } from '../data/templates/types';
import { getAllSets, getSetById, planToTemplate } from '../data/sets';
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
        (survivor, removed) => useTrackStore.getState().connectNodes(survivor, removed),
        (edgeId, color, stock) => useSimulationStore.getState().spawnTrain(edgeId, color, undefined, undefined, stock),
        () => { /* headless: caller steps explicitly */ },
        false,
        useTrackStore.getState().setNodeHeights
    );
    return edgeIds;
}

/**
 * Build one of a boxed set's layout plans (default: its first) and spawn
 * the plan's trains, like `loadRecipe`. Throws for an unknown set or plan.
 */
export function loadSetPlan(setId: string, planId?: string): (EdgeId | null)[] {
    const set = getSetById(setId);
    if (!set) throw new Error(`Unknown set "${setId}"`);
    const plan = planId ? set.plans.find(p => p.id === planId) : set.plans[0];
    if (!plan) throw new Error(`Set "${setId}" has no plan "${planId}"`);
    return loadRecipe(planToTemplate(plan));
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
    /** Wrecks on the track now */
    crashed: number;
    /** Trains wrecked since the log was cleared, re-railed ones included */
    wrecks: number;
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
        wrecks: useSimulationStore.getState().wrecks,
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
    loadSetPlan,
    /** Boxed sets and their plan ids, for `loadSetPlan`. */
    listSets: () => getAllSets().map(s => ({ id: s.id, name: s.name, plans: s.plans.map(p => p.id) })),
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
