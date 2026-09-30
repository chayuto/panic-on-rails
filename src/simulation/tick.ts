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
import { useCollectionStore } from '../stores/useCollectionStore';
import { stepSimulation, createRng, type SimEvent, type SimWorld, type StepContext } from './step';
import { earningsFor } from './economy';
import { finishSession, tallySession } from './session';
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

/** Earnings not yet paid into the wallet (cents), to avoid a store write per edge. */
let pendingEarnings = 0;
/** Pay out once this much has built up (cents). */
const EARNINGS_FLUSH_CENTS = 50;

/** Pay any earnings still held back into the wallet. */
export function flushEarnings(): void {
    const cents = Math.round(pendingEarnings);
    if (cents === 0) return;
    pendingEarnings -= cents;
    useCollectionStore.getState().earn(cents);
}

/** Running trains earn hobby money in collection mode; crashes cost repairs. */
function settleEarnings(events: SimEvent[], before: SimWorld): void {
    if (useCollectionStore.getState().mode !== 'collection') return;
    const { income, repairs } = earningsFor(events, before.edges);
    pendingEarnings += income - repairs;
    // Bills show up at once; income is paid out in small lumps
    if (repairs > 0 || pendingEarnings >= EARNINGS_FLUSH_CENTS) flushEarnings();
}

/** Snapshot the stores into a `SimWorld`. */
export function readWorld(): SimWorld {
    const { edges, nodes } = useTrackStore.getState();
    const { trains, crashedParts } = useSimulationStore.getState();
    const { sensors, signals, wires, stations } = useLogicStore.getState();
    return { trains, edges, nodes, sensors, signals, wires, stations, crashedParts };
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
    const wrecked = events.filter(e => e.type === 'collision' || e.type === 'derail').length;
    if (wrecked > 0) sim.recordWrecks(wrecked);

    for (const event of events) {
        logEvent(event, before);
        options.sink?.(event, world);
    }
    if (events.length > 0) settleEarnings(events, before);
    keepSessionTally(events, before);
    return events;
}

/**
 * Count the tick into the operating session, and end it when its time is
 * up: a clean session's bonus is paid into the wallet in collection mode.
 */
function keepSessionTally(events: SimEvent[], before: SimWorld): void {
    const { session, simElapsed } = useSimulationStore.getState();
    if (!session) return;
    const tally = tallySession(session, events, before.edges);
    if (simElapsed < tally.endsAt) {
        if (tally !== session) useSimulationStore.setState({ session: tally });
        return;
    }
    const result = finishSession(tally, simElapsed);
    if (result.bonus > 0 && useCollectionStore.getState().mode === 'collection') {
        flushEarnings();
        useCollectionStore.getState().earn(result.bonus);
    }
    useSimulationStore.setState({ session: null, sessionResult: result });
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
    flushEarnings();
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
        case 'derail':
            log('derail', event.trainId, event.edgeId, `derailed at ${Math.round(event.speed)} mm/s on ${partOf(event.edgeId)}`);
            break;
        case 'station-stop':
            log('station', event.trainId, event.edgeId, `called at ${before.stations[event.stationId]?.name ?? 'a station'}: fares $${(event.fare / 100).toFixed(2)}`);
            break;
        case 'sensor':
            if (event.state === 'on') {
                log('sensor', '' as TrainId, event.edgeId, `sensor ${event.sensorId.slice(0, 8)} triggered`);
            }
            break;
    }
}
