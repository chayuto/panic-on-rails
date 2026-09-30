/**
 * Simulation Step — the pure core of the game loop.
 *
 * `stepSimulation(world, dt, ctx)` advances the simulation by one tick and
 * returns the next world plus a list of events. It never touches Zustand,
 * audio, the DOM, `performance.now()` or `Math.random()` directly: time and
 * randomness come in through `ctx`, side effects go out as `events`.
 *
 * This is what lets the simulation run headlessly (Vitest, agents, replays)
 * and deterministically (seeded RNG, fixed dt). The browser game loop
 * (`useGameLoop`) is a thin rAF wrapper around `tickSimulation()` in
 * `./tick.ts`, which reads the stores, calls this, and writes back.
 */

import type {
    Train, TrainId, TrackEdge, TrackNode, EdgeId, NodeId, Vector2,
    Sensor, SensorId, Signal, SignalId, Wire, WireId, SignalState, Station, StationId,
} from '../types';
import type { CrashedPart } from '../utils/crashPhysics';
import { updateCrashedParts } from '../utils/crashPhysics';
import { calculateTrainMovement } from './movement';
import { checkCollisions } from './collision';
import { carBodies, detectNearMisses } from '../utils/collisionManager';
import { updateSensors } from './signals';
import { TRAIL_LENGTH } from '../config/rollingStock';
import { AT_STOP_LINE, approachSpeed, derailSpeed, lookaheadFor, stopAhead, stoppingLimit, targetSpeed, throttleOf } from './driving';
import { explodeTrain } from '../utils/crashPhysics';
import { getPositionOnEdge } from '../utils/trainGeometry';
import { reverseConsist } from '../utils/trainCars';
import { linkedPoints } from '../utils/switchRouting';
import { sizeOf } from '../config/scales';
import { STATIONS } from '../config/stations';
import { fareFor, nextDeparture, stationsByEdge } from './stations';
import { carriesPassengers } from '../data/rollingStock';

/** World Y that debris falls onto (historical game-loop value). */
const DEBRIS_GROUND_Y = 500;

/** Everything the simulation reads or writes during a tick. */
export interface SimWorld {
    trains: Record<TrainId, Train>;
    edges: Record<EdgeId, TrackEdge>;
    nodes: Record<NodeId, TrackNode>;
    sensors: Record<SensorId, Sensor>;
    signals: Record<SignalId, Signal>;
    wires: Record<WireId, Wire>;
    stations: Record<StationId, Station>;
    crashedParts: CrashedPart[];
    /** Pairs of trains close enough for a near miss last tick (`idA|idB`), so each encounter counts once */
    nearPairs: string[];
}

/** Injected clock and randomness — the only sources of nondeterminism. */
export interface StepContext {
    /** Timestamp (ms) stamped onto bounce/crash animations. */
    now: number;
    /** Uniform random in [0, 1). Use `createRng(seed)` for determinism. */
    random: () => number;
    /** Railway time when the tick starts (seconds): stations' timetables run by it. Default 0. */
    clock?: number;
}

/** Something that happened during a tick. Consumers map these to audio, FX and logs. */
export type SimEvent =
    | { type: 'traverse'; trainId: TrainId; fromEdgeId: EdgeId; toEdgeId: EdgeId }
    | { type: 'bounce'; trainId: TrainId; edgeId: EdgeId }
    | { type: 'signal-hold'; trainId: TrainId; edgeId: EdgeId }
    | { type: 'signal-release'; trainId: TrainId; edgeId: EdgeId }
    | { type: 'collision'; trainId: TrainId; otherTrainIds: TrainId[]; edgeId: EdgeId; location: Vector2; severity: number }
    | { type: 'derail'; trainId: TrainId; edgeId: EdgeId; location: Vector2; speed: number }
    | { type: 'sensor'; sensorId: SensorId; edgeId: EdgeId; state: 'on' | 'off' }
    | { type: 'switch'; nodeId: NodeId; switchState: 0 | 1 }
    /** A passenger train stood at a platform; its passengers paid `fare` (US cents) */
    | {
        type: 'station-stop'; trainId: TrainId; stationId: StationId; edgeId: EdgeId; fare: number;
        /** With a timetable: the departure it waits for (railway seconds) */
        departs?: number;
    }
    /** Two trains came within a car's nose of each other without touching */
    | { type: 'near-miss'; trainIds: [TrainId, TrainId]; location: Vector2 }
    | { type: 'signal'; signalId: SignalId; state: SignalState };

export interface StepResult {
    world: SimWorld;
    events: SimEvent[];
}

/**
 * Advance the world by `dt` simulated seconds.
 *
 * Order: movement → collisions and near misses → debris → sensors/wires. Inputs are never
 * mutated; changed collections are copied.
 *
 * Trains stopped by the player don't move, and nor do wrecks: a train that
 * runs into one crashes too. Trains heading into a node with a
 * red signal stop short of it (see `calculateTrainMovement`). Passenger
 * trains stop at the far end of each station's platform, stand there for a
 * while, and are paid their passengers' fares.
 */
export function stepSimulation(world: SimWorld, dt: number, ctx: StepContext): StepResult {
    const events: SimEvent[] = [];
    const { edges } = world;
    let nodes = world.nodes;

    // 1. Movement
    const redNodes = new Set<NodeId>();
    for (const signal of Object.values(world.signals)) {
        if (signal.state === 'red') redNodes.add(signal.nodeId);
    }

    const platforms = stationsByEdge(world.stations);

    const trains: Record<TrainId, Train> = {};
    let crashedParts = world.crashedParts;
    for (const train of Object.values(world.trains)) {
        if (train.crashed || train.stopped) {
            trains[train.id] = train;
            continue;
        }

        // Standing at a platform while the passengers get on and off
        if (train.dwell !== undefined) {
            const { dwell: _dwell, ...ready } = train;
            const dwell = train.dwell - dt;
            trains[train.id] = dwell > 0 ? { ...train, dwell } : ready;
            continue;
        }

        // Power pack: speed follows the throttle with momentum, braking in
        // time for red signals, platforms and buffer stops ahead
        const size = sizeOf(train.scale);
        const calls = platforms.size > 0 && carriesPassengers(train);
        let limit = targetSpeed(train);
        const stop = stopAhead(train, edges, nodes, redNodes, lookaheadFor(train.speed, size), calls ? platforms : undefined);
        if (stop) limit = Math.min(limit, stoppingLimit(stop.distance, dt, size));
        let speed = approachSpeed(train.speed, limit, dt, size);
        // Pulling up at a platform: run just to its end this tick, and stand
        const arriving = stop?.kind === 'station' && stop.stationId !== undefined && speed * dt >= stop.distance;
        if (arriving) speed = dt > 0 ? stop.distance / dt : 0;
        // Stopped: the direction lever takes effect, the consist staying put
        const start = train.reverseRequested && speed === 0 ? reverseConsist(train, edges, nodes) : train;

        const moving: Train = { ...start, speed, throttle: throttleOf(train) };
        const update = calculateTrainMovement(moving, dt, edges, nodes, redNodes);
        if (!update) {
            trains[train.id] = train;
            continue;
        }
        // Standing at the stop line of a red signal counts as held, too
        const atRedLine = stop?.kind === 'signal' && stop.distance <= AT_STOP_LINE && speed === 0;
        if (atRedLine) update.held = true;
        if (update.held) speed = 0;
        let next: Train = {
            ...moving,
            distanceAlongEdge: update.distance,
            currentEdgeId: update.edgeId,
            direction: update.direction,
        };
        if (update.edgeId !== moving.currentEdgeId && !update.bounced) {
            // Remember the route so the cars behind can follow it through turnouts
            next.trail = [moving.currentEdgeId, ...(moving.trail ?? [])].slice(0, TRAIL_LENGTH);
        }
        if (calls) {
            // The passengers' ride grows; off the station's piece, it can call there again
            next.ride = (train.ride ?? 0) + speed * dt;
            if (update.edgeId !== moving.currentEdgeId) delete next.calledAt;
        }
        if (update.bounced) {
            // Turned back at the end of the line: the consist stays put and
            // its far end leads (the locomotive now pushes, or leads again)
            next = reverseConsist({ ...next, direction: -update.direction as 1 | -1, trail: moving.trail }, edges, nodes);
        }
        if (update.edgeId !== moving.currentEdgeId) {
            events.push({ type: 'traverse', trainId: train.id, fromEdgeId: moving.currentEdgeId, toEdgeId: update.edgeId });
        }
        if (update.bounced) {
            next.bounceTime = ctx.now;
            events.push({ type: 'bounce', trainId: train.id, edgeId: update.edgeId });
        }
        if (update.held !== !!train.heldAtSignal) {
            next.heldAtSignal = update.held;
            events.push({ type: update.held ? 'signal-hold' : 'signal-release', trainId: train.id, edgeId: update.edgeId });
        }
        next.speed = speed;
        if (arriving) {
            // It stands while the passengers get on and off; with a
            // timetable, until the first departure due after that
            const arrivedAt = (ctx.clock ?? 0) + dt;
            const departs = nextDeparture(world.stations[stop.stationId!] ?? {}, arrivedAt + STATIONS.DWELL_SECONDS);
            events.push({
                type: 'station-stop', trainId: train.id, stationId: stop.stationId!, edgeId: next.currentEdgeId, fare: fareFor(next),
                ...(departs !== undefined && { departs }),
            });
            const dwell = departs !== undefined ? departs - arrivedAt : STATIONS.DWELL_SECONDS;
            next = { ...next, speed: 0, dwell, calledAt: stop.stationId, ride: 0 };
        }

        // Too fast for the curve: off the rails
        const curve = edges[update.edgeId]?.intrinsicGeometry;
        if (curve?.type === 'arc' && speed > derailSpeed(curve.radius, size)) {
            const edge = edges[update.edgeId];
            const location = getPositionOnEdge(edge, update.distance, nodes);
            crashedParts = [...crashedParts, ...explodeTrain({
                position: location,
                velocity: { x: 0, y: 0 },
                trainColor: train.color,
                severity: 2,
                trainId: train.id,
            }, ctx.random)];
            trains[train.id] = { ...next, crashed: true, crashTime: ctx.now, speed: 0 };
            events.push({ type: 'derail', trainId: train.id, edgeId: update.edgeId, location, speed });
            continue;
        }
        trains[train.id] = next;
    }

    // 2. Collisions: trains into each other, or into a wreck. Every car's
    // body is worked out once, for collisions and near misses both
    const bodies = Object.values(trains).some(t => !t.crashed) ? carBodies(trains, edges, nodes) : [];
    for (const crash of checkCollisions(trains, edges, ctx.random, nodes, bodies)) {
        const train = trains[crash.trainId];
        if (!train) continue;
        crashedParts = [...crashedParts, ...crash.debris];
        trains[train.id] = { ...train, crashed: true, crashTime: ctx.now, speed: 0 };
        events.push({
            type: 'collision',
            trainId: train.id,
            otherTrainIds: crash.otherTrainIds,
            edgeId: train.currentEdgeId,
            location: crash.location,
            severity: crash.severity,
        });
    }

    // Near misses: a pair counts once as it comes close, not every tick it stays close.
    // (The bodies' trains, updated for any that just crashed.)
    const near = detectNearMisses(trains, edges, nodes, bodies.map(b => ({ ...b, train: trains[b.train.id] ?? b.train })));
    const wasNear = new Set(world.nearPairs);
    for (const miss of near) {
        if (!wasNear.has(miss.key)) events.push({ type: 'near-miss', trainIds: miss.trainIds, location: miss.location });
    }
    const nearKeys = near.map(m => m.key).sort();
    const nearPairs = nearKeys.length === world.nearPairs.length && nearKeys.every((k, i) => k === world.nearPairs[i])
        ? world.nearPairs
        : nearKeys;

    // 3. Debris physics
    if (crashedParts.length > 0) {
        crashedParts = updateCrashedParts(crashedParts, dt, DEBRIS_GROUND_Y);
    }

    // 4. Sensors and wires
    let sensors = world.sensors;
    let signals = world.signals;
    const sensorUpdates = updateSensors(trains, sensors, world.wires);
    if (sensorUpdates.length > 0) sensors = { ...sensors };

    for (const update of sensorUpdates) {
        const sensor = sensors[update.sensorId];
        if (!sensor) continue;
        sensors[update.sensorId] = { ...sensor, state: update.newState };
        events.push({ type: 'sensor', sensorId: sensor.id, edgeId: sensor.edgeId, state: update.newState });

        for (const action of update.triggeredActions) {
            if (action.targetType === 'switch') {
                const node = nodes[action.targetId];
                if (!node || node.type !== 'switch') continue;
                const current = node.switchState ?? 0;
                const target: 0 | 1 =
                    action.action === 'set_main' ? 0
                        : action.action === 'set_branch' ? 1
                            : (current === 0 ? 1 : 0);
                if (target === current) continue;
                const moved = linkedPoints(node, nodes);
                nodes = { ...nodes };
                for (const points of moved) {
                    nodes[points.id] = { ...points, switchState: target };
                    events.push({ type: 'switch', nodeId: points.id, switchState: target });
                }
            } else {
                const signal = signals[action.targetId];
                if (!signal) continue;
                const target: SignalState =
                    action.action === 'set_red' ? 'red'
                        : action.action === 'set_green' ? 'green'
                            : (signal.state === 'red' ? 'green' : 'red');
                if (target === signal.state) continue;
                signals = { ...signals, [signal.id]: { ...signal, state: target } };
                events.push({ type: 'signal', signalId: signal.id, state: target });
            }
        }
    }

    return {
        world: { ...world, trains, nodes, sensors, signals, crashedParts, nearPairs },
        events,
    };
}

/**
 * Small, fast seeded PRNG (mulberry32). Same seed → same sequence, so
 * crash debris and any future randomness replay exactly in tests.
 */
export function createRng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
