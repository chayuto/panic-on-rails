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
    Sensor, SensorId, Signal, SignalId, Wire, WireId, SignalState,
} from '../types';
import type { CrashedPart } from '../utils/crashPhysics';
import { updateCrashedParts } from '../utils/crashPhysics';
import { calculateTrainMovement } from './movement';
import { checkCollisions } from './collision';
import { updateSensors } from './signals';
import { TRAIL_LENGTH } from '../config/rollingStock';
import { AT_STOP_LINE, approachSpeed, derailSpeed, lookaheadFor, stopAhead, stoppingLimit, targetSpeed, throttleOf } from './driving';
import { explodeTrain } from '../utils/crashPhysics';
import { getPositionOnEdge } from '../utils/trainGeometry';
import { reverseConsist } from '../utils/trainCars';
import { linkedPoints } from '../utils/switchRouting';

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
    crashedParts: CrashedPart[];
}

/** Injected clock and randomness — the only sources of nondeterminism. */
export interface StepContext {
    /** Timestamp (ms) stamped onto bounce/crash animations. */
    now: number;
    /** Uniform random in [0, 1). Use `createRng(seed)` for determinism. */
    random: () => number;
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
    | { type: 'signal'; signalId: SignalId; state: SignalState };

export interface StepResult {
    world: SimWorld;
    events: SimEvent[];
}

/**
 * Advance the world by `dt` simulated seconds.
 *
 * Order: movement → collisions → debris → sensors/wires. Inputs are never
 * mutated; changed collections are copied.
 *
 * Trains stopped by the player don't move. Trains heading into a node with a
 * red signal stop short of it (see `calculateTrainMovement`).
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

    const trains: Record<TrainId, Train> = {};
    let crashedParts = world.crashedParts;
    for (const train of Object.values(world.trains)) {
        if (train.crashed || train.stopped) {
            trains[train.id] = train;
            continue;
        }

        // Power pack: speed follows the throttle with momentum, braking in
        // time for red signals and buffer stops ahead
        let limit = targetSpeed(train);
        const stop = stopAhead(train, edges, nodes, redNodes, lookaheadFor(train.speed));
        if (stop) limit = Math.min(limit, stoppingLimit(stop.distance, dt));
        let speed = approachSpeed(train.speed, limit, dt);
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

        // Too fast for the curve: off the rails
        const curve = edges[update.edgeId]?.intrinsicGeometry;
        if (curve?.type === 'arc' && speed > derailSpeed(curve.radius)) {
            const edge = edges[update.edgeId];
            const location = getPositionOnEdge(edge, update.distance, nodes);
            crashedParts = [...crashedParts, ...explodeTrain({
                position: location,
                velocity: { x: 0, y: 0 },
                trainColor: train.color,
                severity: 2,
            }, ctx.random)];
            trains[train.id] = { ...next, crashed: true, crashTime: ctx.now, speed: 0 };
            events.push({ type: 'derail', trainId: train.id, edgeId: update.edgeId, location, speed });
            continue;
        }
        trains[train.id] = next;
    }

    // 2. Collisions
    const collisions = checkCollisions(trains, edges, ctx.random);
    const collidedIds = new Set(collisions.flatMap(c => c.trainIds));
    for (const collision of collisions) {
        crashedParts = [...crashedParts, ...collision.debris];
        for (const id of collision.trainIds) {
            const train = trains[id];
            if (!train) continue;
            trains[id] = { ...train, crashed: true, crashTime: ctx.now, speed: 0 };
            events.push({
                type: 'collision',
                trainId: id,
                // Partners are whichever other trains crashed in this same tick
                otherTrainIds: [...collidedIds].filter(other => other !== id),
                edgeId: train.currentEdgeId,
                location: collision.location,
                severity: collision.severity,
            });
        }
    }

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
        world: { ...world, trains, nodes, sensors, signals, crashedParts },
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
