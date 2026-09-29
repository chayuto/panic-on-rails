/**
 * Driving: how a train's speed follows its throttle, like a model on a
 * power pack. Pure functions, used by `stepSimulation`.
 *
 * - The throttle sets a target speed; the train accelerates or brakes
 *   toward it with momentum.
 * - Approaching a red signal's stop line or a buffer stop, it brakes so it
 *   arrives at a crawl.
 * - Every curve has a comfortable top speed (from its radius). Take one
 *   much faster than that and the train derails.
 *
 * Speeds are model mm/s. At N scale (1:160), 100 mm/s is 58 km/h.
 */

import type { EdgeId, NodeId, TrackEdge, TrackNode, Train } from '../types';
import { resolveNextEdge, SIGNAL_STOP_GAP } from './movement';

export const DRIVING = {
    /** Pick-up under power (mm/s²) */
    ACCELERATION: 80,
    /** Service braking (mm/s²) */
    BRAKING: 160,
    /** Slowest a train creeps up to a stop line or buffer stop (mm/s) */
    CREEP: 6,
    /** A new train's throttle (mm/s): about 58 km/h at N scale */
    DEFAULT_THROTTLE: 100,
    /** Throttle fully open (mm/s): about 170 km/h at N scale */
    MAX_THROTTLE: 300,
    /** Sideways acceleration a curve takes comfortably (mm/s²): R315 ≈ 180 mm/s */
    CURVE_ACCEL: 103,
    /** This far over a curve's comfortable speed, the train leaves the rails */
    DERAIL_FACTOR: 1.25,
    /** Model scale, for scale speeds */
    SCALE: 160,
} as const;

/** Comfortable top speed on a curve of `radius` mm. */
export function curveLimit(radius: number): number {
    return Math.sqrt(DRIVING.CURVE_ACCEL * radius);
}

/** Speed at which a curve of `radius` mm derails a train. */
export function derailSpeed(radius: number): number {
    return curveLimit(radius) * DRIVING.DERAIL_FACTOR;
}

/** Model mm/s as scale km/h. */
export function scaleKmh(mmPerSecond: number): number {
    return (mmPerSecond * DRIVING.SCALE * 3.6) / 1000;
}

/**
 * Top speed with `distance` mm left before a stop, braking at the service
 * rate. With `dt`, it allows for the tick about to be run at that speed
 * (v·dt + v²/2a ≤ distance), so braking starts on time and the train
 * arrives at a crawl rather than one tick too fast.
 */
export function stoppingLimit(distance: number, dt = 0): number {
    const a = DRIVING.BRAKING;
    const d = Math.max(0, distance);
    return Math.max(DRIVING.CREEP, -a * dt + Math.sqrt((a * dt) ** 2 + 2 * a * d));
}

/** Move `speed` toward `target` at most one tick's acceleration or braking. */
export function approachSpeed(speed: number, target: number, dt: number): number {
    if (target > speed) return Math.min(target, speed + DRIVING.ACCELERATION * dt);
    return Math.max(target, speed - DRIVING.BRAKING * dt);
}

/** The speed a train is trying to reach: its throttle, or zero if stopping or reversing. */
export function targetSpeed(train: Train): number {
    if (train.stopped || train.reverseRequested) return 0;
    return throttleOf(train);
}

/** A train's throttle; a train that never had one keeps cruising at its speed. */
export function throttleOf(train: Train): number {
    return train.throttle ?? train.speed;
}

/** Within this distance (mm) of a red signal's stop line, a standing train is held there. */
export const AT_STOP_LINE = 0.5;

/** The next place a train must stop, and how far away it is (mm). */
export interface StopAhead {
    distance: number;
    /** A red signal's stop line, or the end of the line (a buffer stop or open end) */
    kind: 'signal' | 'end';
}

/**
 * The next place the train must stop, looking at most `horizon` mm ahead
 * along its route: a red signal's stop line or the end of the line. Null if
 * there's none in range. A stop line the train is already past (it can't
 * stop for it) doesn't count.
 */
export function stopAhead(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>,
    redNodes: ReadonlySet<NodeId>,
    horizon: number
): StopAhead | null {
    let edge = edges[train.currentEdgeId];
    if (!edge) return null;
    let direction = train.direction;
    let position = train.distanceAlongEdge;
    let travelled = 0;

    for (let guard = 0; guard < 32 && travelled <= horizon; guard++) {
        const toExit = direction === 1 ? edge.length - position : position;
        const exitNodeId = direction === 1 ? edge.endNodeId : edge.startNodeId;
        if (redNodes.has(exitNodeId)) {
            const toLine = toExit - Math.min(SIGNAL_STOP_GAP, edge.length);
            if (toLine >= -1e-6) return { distance: travelled + Math.max(0, toLine), kind: 'signal' };
        }
        const nextId = resolveNextEdge(edge.id, nodes[exitNodeId]);
        const next = nextId ? edges[nextId] : undefined;
        if (!next) return { distance: travelled + toExit, kind: 'end' };
        travelled += toExit;
        direction = next.startNodeId === exitNodeId ? 1 : -1;
        position = direction === 1 ? 0 : next.length;
        edge = next;
    }
    return null;
}

/** How far ahead to look for stops: the braking distance from `speed`, plus a margin. */
export function lookaheadFor(speed: number): number {
    return (speed * speed) / (2 * DRIVING.BRAKING) + 40;
}
