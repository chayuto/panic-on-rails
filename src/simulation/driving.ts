/**
 * Driving: how a train's speed follows its throttle, like a model on a
 * power pack. Pure functions, used by `stepSimulation`.
 *
 * - The throttle sets a target speed; the train accelerates or brakes
 *   toward it with momentum.
 * - Approaching a red signal's stop line or a buffer stop, it brakes so it
 *   arrives at a crawl. A passenger train brakes for the end of a station's
 *   platform, too.
 * - Every curve has a comfortable top speed (from its radius). Take one
 *   much faster than that and the train derails.
 *
 * Speeds are model mm/s. At N scale (1:160), 100 mm/s is 58 km/h. The
 * constants are N's; a bigger scale multiplies them by its `size` (see
 * config/scales), so an H0 train drives like an N one at 1.84× the mm/s.
 */

import type { EdgeId, NodeId, Station, StationId, TrackEdge, TrackNode, Train } from '../types';
import { resolveNextEdge, SIGNAL_STOP_GAP } from './movement';
import { stopPointOf, type StationsByEdge } from './stations';

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
} as const;

/** Comfortable top speed on a curve of `radius` mm, for a train `size` times N. */
export function curveLimit(radius: number, size = 1): number {
    return Math.sqrt(DRIVING.CURVE_ACCEL * size * radius);
}

/** Speed at which a curve of `radius` mm derails a train. */
export function derailSpeed(radius: number, size = 1): number {
    return curveLimit(radius, size) * DRIVING.DERAIL_FACTOR;
}

/** Model mm/s as scale km/h, at 1:`ratio`. */
export function scaleKmh(mmPerSecond: number, ratio = 160): number {
    return (mmPerSecond * ratio * 3.6) / 1000;
}

/**
 * Top speed with `distance` mm left before a stop, braking at the service
 * rate. With `dt`, it allows for the tick about to be run at that speed
 * (v·dt + v²/2a ≤ distance), so braking starts on time and the train
 * arrives at a crawl rather than one tick too fast.
 */
export function stoppingLimit(distance: number, dt = 0, size = 1): number {
    const a = DRIVING.BRAKING * size;
    const d = Math.max(0, distance);
    return Math.max(DRIVING.CREEP * size, -a * dt + Math.sqrt((a * dt) ** 2 + 2 * a * d));
}

/** Move `speed` toward `target` at most one tick's acceleration or braking. */
export function approachSpeed(speed: number, target: number, dt: number, size = 1): number {
    if (target > speed) return Math.min(target, speed + DRIVING.ACCELERATION * size * dt);
    return Math.max(target, speed - DRIVING.BRAKING * size * dt);
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
    /** A red signal's stop line, the far end of a station's platform, or the end of the line (a buffer stop or open end) */
    kind: 'signal' | 'station' | 'end';
    /** The station, for a station stop */
    stationId?: StationId;
}

/**
 * The next place the train must stop, looking at most `horizon` mm ahead
 * along its route: a red signal's stop line, the end of a platform (given
 * the `stations` it calls at), or the end of the line. Null if there's
 * none in range. A stop line the train is already past (it can't stop for
 * it) doesn't count, and nor does the station it has just called at.
 */
export function stopAhead(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>,
    redNodes: ReadonlySet<NodeId>,
    horizon: number,
    stations?: StationsByEdge
): StopAhead | null {
    let edge = edges[train.currentEdgeId];
    if (!edge) return null;
    let direction = train.direction;
    let position = train.distanceAlongEdge;
    let travelled = 0;

    for (let guard = 0; guard < 32 && travelled <= horizon; guard++) {
        const toExit = direction === 1 ? edge.length - position : position;
        const exitNodeId = direction === 1 ? edge.endNodeId : edge.startNodeId;
        let signalLine: number | null = null;
        if (redNodes.has(exitNodeId)) {
            const toLine = toExit - Math.min(SIGNAL_STOP_GAP, edge.length);
            if (toLine >= -1e-6) signalLine = Math.max(0, toLine);
        }
        const platform = platformAhead(stations?.get(edge.id), direction, position, train.calledAt);
        if (platform && (signalLine === null || platform.ahead <= signalLine)) {
            return { distance: travelled + platform.ahead, kind: 'station', stationId: platform.id };
        }
        if (signalLine !== null) return { distance: travelled + signalLine, kind: 'signal' };
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

/**
 * The nearest platform end ahead on a piece, heading `direction` from
 * `position`, skipping the station just called at. A train that ran a
 * hair past a platform's end still counts as there.
 */
function platformAhead(
    stations: readonly Station[] | undefined,
    direction: 1 | -1,
    position: number,
    calledAt: StationId | undefined
): { id: StationId; ahead: number } | null {
    let nearest: { id: StationId; ahead: number } | null = null;
    for (const station of stations ?? []) {
        if (station.id === calledAt) continue;
        const ahead = (stopPointOf(station, direction) - position) * direction;
        if (ahead < -AT_STOP_LINE) continue;
        if (!nearest || ahead < nearest.ahead) nearest = { id: station.id, ahead: Math.max(0, ahead) };
    }
    return nearest;
}

/** How far ahead to look for stops: the braking distance from `speed`, plus a margin. */
export function lookaheadFor(speed: number, size = 1): number {
    return (speed * speed) / (2 * DRIVING.BRAKING * size) + 40 * size;
}
