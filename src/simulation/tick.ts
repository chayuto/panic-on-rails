/**
 * Store-bound simulation tick.
 *
 * `tickSimulation(realDt, sink)` reads the live Zustand stores, advances the
 * pure `stepSimulation()` core, writes the next world back, and hands every
 * event to a `SimEventSink`. The browser game loop passes a sink that plays
 * audio and visual effects; headless callers (Vitest, the debug bridge's
 * `sim.step()`) pass a recording sink or none at all.
 */

import { useSimulationStore } from '../stores/useSimulationStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useLogicStore } from '../stores/useLogicStore';
import { stepSimulation, createRng, type SimEvent, type SimWorld, type StepContext } from './step';
import type { TrainId } from '../types';

export type SimEventSink = (event: SimEvent, world: SimWorld) => void;

export interface TickOptions {
    /** Side-effect handler for events (audio, FX). Omit for silent/headless. */
    sink?: SimEventSink;
    /** Clock/RNG override. Defaults to `performance.now()` and the shared RNG. */
    ctx?: Partial<StepContext>;
}

let sharedRandom: () => number = Math.random;

/**
 * Seed the simulation RNG. Call before a scenario to make crash debris (and
 * anything else random) reproducible; pass `null` to go back to Math.random.
 */
export function seedSimulation(seed: number | null): void {
    sharedRandom = seed === null ? Math.random : createRng(seed);
}

/** Snapshot the stores into a `SimWorld`. */
export function readWorld(): SimWorld {
    const { edges, nodes } = useTrackStore.getState();
    const { trains, crashedParts } = useSimulationStore.getState();
    const { sensors, signals, wires } = useLogicStore.getState();
    return { trains, edges, nodes, sensors, signals, wires, crashedParts };
}

/**
 * Advance the store-backed simulation by `realDt` wall-clock seconds
 * (scaled by the speed multiplier). Returns the events produced.
 */
export function tickSimulation(realDt: number, options: TickOptions = {}): SimEvent[] {
    const sim = useSimulationStore.getState();
    const dt = realDt * sim.speedMultiplier;
    const before = readWorld();

    const { world, events } = stepSimulation(before, dt, {
        now: options.ctx?.now ?? performance.now(),
        random: options.ctx?.random ?? sharedRandom,
    });

    // Write back only what changed, so unrelated subscribers don't re-render
    sim.tickElapsed(dt);
    useSimulationStore.setState({
        trains: world.trains,
        ...(world.crashedParts !== before.crashedParts && { crashedParts: world.crashedParts }),
    });
    if (world.nodes !== before.nodes) {
        useTrackStore.setState({ nodes: world.nodes });
    }
    if (world.sensors !== before.sensors || world.signals !== before.signals) {
        useLogicStore.setState({ sensors: world.sensors, signals: world.signals });
    }

    for (const event of events) {
        logEvent(event, before);
        options.sink?.(event, world);
    }
    return events;
}

/**
 * Run `frames` fixed-size ticks. Deterministic when the RNG is seeded and
 * `ctx.now` is supplied. Stops early if every train has crashed.
 */
export function runSimulation(
    frames: number,
    frameDt = 1 / 60,
    options: TickOptions = {}
): SimEvent[] {
    const all: SimEvent[] = [];
    for (let i = 0; i < frames; i++) {
        const now = options.ctx?.now !== undefined ? options.ctx.now + i * frameDt * 1000 : undefined;
        all.push(...tickSimulation(frameDt, { ...options, ctx: { ...options.ctx, now } }));
    }
    return all;
}

/** Mirror events into the simulation's ring-buffered event log (`simLog`). */
function logEvent(event: SimEvent, before: SimWorld): void {
    const { logEvent: log } = useSimulationStore.getState();
    const partOf = (edgeId: string) => before.edges[edgeId]?.partId ?? '?';
    switch (event.type) {
        case 'traverse':
            log('traverse', event.trainId, event.toEdgeId, `${partOf(event.fromEdgeId)} → ${partOf(event.toEdgeId)}`);
            break;
        case 'bounce':
            log('bounce', event.trainId, event.edgeId, 'dead end');
            break;
        case 'collision':
            log('collision', event.trainId, event.edgeId, `crashed with ${event.otherTrainIds.join(', ')}`);
            break;
        case 'sensor':
            if (event.state === 'on') {
                log('sensor', '' as TrainId, event.edgeId, `sensor ${event.sensorId.slice(0, 8)} triggered`);
            }
            break;
    }
}
