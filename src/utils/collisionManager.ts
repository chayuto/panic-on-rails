/**
 * Collision Manager for PanicOnRails
 *
 * Two trains collide when a car of one overlaps a car of the other. Each car
 * is a rectangle of its real size, at the pose the renderer draws it
 * (`getCarPoses`), so trains meeting on a crossing's diamond collide
 * although their tracks never share a node, and so does a train fouling a
 * turnout another is passing through.
 *
 * A crashed train is wreckage: it lies where it came to rest until the
 * player clears it, and a train that runs into it crashes too.
 */

import type { Train, TrackEdge, EdgeId, NodeId, TrackNode, Vector2 } from '../types';
import { ROLLING_STOCK } from '../config/rollingStock';
import { sizeOf } from '../config/scales';
import { frameGeometry, getCarPoses } from './trainCars';

/**
 * How much of a car's body counts, lengthwise and across. A little under the
 * full outline, so cars merely grazing (buffers, the sprite's rounded
 * corners) don't count; tracks at standard spacing stay well clear.
 */
const CONTACT_LENGTH = 0.9;
const CONTACT_WIDTH = 0.85;

export interface CollisionResult {
    trainA: Train;
    trainB: Train;
    edgeId: string;
    /** Where the two cars met: between their centres */
    location: Vector2;
}

/** One car's body as a rectangle: centre, unit axis and half sizes. */
export interface CarBody {
    train: Train;
    cx: number;
    cy: number;
    /** Unit vector along the car */
    ux: number;
    uy: number;
    halfLength: number;
    halfWidth: number;
    /** Bounding circle radius, for the broad phase */
    reach: number;
}

function bodiesOf(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>,
    geometryOf: ReturnType<typeof frameGeometry>
): CarBody[] {
    const halfWidth = (ROLLING_STOCK.CAR_WIDTH * sizeOf(train.scale) * CONTACT_WIDTH) / 2;
    return getCarPoses(train, edges, nodes, geometryOf).map(pose => {
        const r = (pose.rotation * Math.PI) / 180;
        const halfLength = (pose.length * CONTACT_LENGTH) / 2;
        return {
            train,
            cx: pose.x,
            cy: pose.y,
            ux: Math.cos(r),
            uy: Math.sin(r),
            halfLength,
            halfWidth,
            reach: Math.hypot(halfLength, halfWidth),
        };
    });
}

/**
 * How close counts as a near miss, N scale (mm; a bigger scale grows them):
 * a car's nose this near another car, but only this near sideways, so
 * trains passing on tracks at standard spacing (33 mm) don't count.
 */
const NEAR_AHEAD = 25;
const NEAR_BESIDE = 3;
/** And at least one of the two trains going this fast (mm/s, N scale) */
const NEAR_SPEED = 40;

/** Half the extent of `b` projected onto the unit axis (ax, ay). */
function extentAlong(b: CarBody, ax: number, ay: number): number {
    const along = Math.abs(b.ux * ax + b.uy * ay);
    const across = Math.abs(-b.uy * ax + b.ux * ay);
    return b.halfLength * along + b.halfWidth * across;
}

/** Separating-axis test for two rotated rectangles. */
export function bodiesOverlap(a: CarBody, b: CarBody): boolean {
    const dx = b.cx - a.cx;
    const dy = b.cy - a.cy;
    if (Math.hypot(dx, dy) > a.reach + b.reach) return false;
    for (const [ax, ay] of [[a.ux, a.uy], [-a.uy, a.ux], [b.ux, b.uy], [-b.uy, b.ux]]) {
        const distance = Math.abs(dx * ax + dy * ay);
        if (distance > extentAlong(a, ax, ay) + extentAlong(b, ax, ay)) return false;
    }
    return true;
}

/** The body grown by `ahead` at each end and `beside` at each side. */
function grown(b: CarBody, ahead: number, beside: number): CarBody {
    const halfLength = b.halfLength + ahead;
    const halfWidth = b.halfWidth + beside;
    return { ...b, halfLength, halfWidth, reach: Math.hypot(halfLength, halfWidth) };
}

export interface NearMiss {
    /** The pair, as `${idA}|${idB}` with the ids in order */
    key: string;
    trainIds: [string, string];
    /** Between the two cars that came closest */
    location: Vector2;
}

/**
 * Pairs of trains whose cars came within a car's nose of each other without
 * touching, one of them moving: a near miss, once per pair. A train is near
 * a wreck, too. Pairs whose cars touch are collisions, not near misses.
 */
export function detectNearMisses(
    trains: Record<string, Train>,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>,
    bodies?: CarBody[]
): NearMiss[] {
    const moving = (t: Train) => !t.crashed && !t.stopped && t.speed >= NEAR_SPEED * sizeOf(t.scale);
    if (!Object.values(trains).some(moving)) return [];
    bodies ??= carBodies(trains, edges, nodes);

    const touching = new Set<string>();
    const near = new Map<string, NearMiss>();
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const [a, b] = bodies[i].train.id < bodies[j].train.id ? [bodies[i], bodies[j]] : [bodies[j], bodies[i]];
            if (a.train.id === b.train.id || (a.train.crashed && b.train.crashed)) continue;
            // Too far apart to touch or come near: most pairs, most of the time
            const size = Math.max(sizeOf(a.train.scale), sizeOf(b.train.scale));
            const margin = Math.hypot(NEAR_AHEAD, NEAR_BESIDE) * size;
            if (Math.hypot(b.cx - a.cx, b.cy - a.cy) > a.reach + b.reach + 2 * margin) continue;
            if (!moving(a.train) && !moving(b.train)) continue;
            const key = `${a.train.id}|${b.train.id}`;
            if (touching.has(key)) continue;
            if (bodiesOverlap(a, b)) {
                touching.add(key);
                near.delete(key);
                continue;
            }
            if (!near.has(key) && bodiesOverlap(grown(a, NEAR_AHEAD * size, NEAR_BESIDE * size), grown(b, NEAR_AHEAD * size, NEAR_BESIDE * size))) {
                near.set(key, { key, trainIds: [a.train.id, b.train.id], location: { x: (a.cx + b.cx) / 2, y: (a.cy + b.cy) / 2 } });
            }
        }
    }
    return [...near.values()];
}

/**
 * Every car of every train, wrecks included, as a body. Collision and
 * near-miss detection can share them within a tick.
 */
export function carBodies(
    trains: Record<string, Train>,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): CarBody[] {
    const geometryOf = frameGeometry(edges, nodes);
    return Object.values(trains).flatMap(t => bodiesOf(t, edges, nodes, geometryOf));
}

/**
 * Every pair of trains with overlapping cars, once per pair: two trains, or
 * a train and a wreck. Wrecks lying against each other are the crash that
 * made them, not a new one. Pass `bodies` (from `carBodies`) to reuse them.
 */
export function detectCollisions(
    trains: Record<string, Train>,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>,
    bodies?: CarBody[]
): CollisionResult[] {
    if (!Object.values(trains).some(t => !t.crashed)) return [];
    bodies ??= carBodies(trains, edges, nodes);
    if (bodies.length < 2) return [];

    // Broad phase: a grid of cells as wide as the biggest car
    const cell = 2 * Math.max(...bodies.map(b => b.reach));
    const cellOf = (b: CarBody) => [Math.floor(b.cx / cell), Math.floor(b.cy / cell)];
    const grid = new Map<string, CarBody[]>();
    for (const b of bodies) {
        const key = cellOf(b).join(',');
        const list = grid.get(key);
        if (list) list.push(b);
        else grid.set(key, [b]);
    }

    const results: CollisionResult[] = [];
    const paired = new Set<string>();
    for (const a of bodies) {
        const [gx, gy] = cellOf(a);
        for (let x = gx - 1; x <= gx + 1; x++) {
            for (let y = gy - 1; y <= gy + 1; y++) {
                for (const b of grid.get(`${x},${y}`) ?? []) {
                    // Each pair of trains once, never a train with itself, and never two wrecks
                    if (b.train.id <= a.train.id || (a.train.crashed && b.train.crashed)) continue;
                    const key = `${a.train.id}|${b.train.id}`;
                    if (paired.has(key) || !bodiesOverlap(a, b)) continue;
                    paired.add(key);
                    results.push({
                        trainA: a.train,
                        trainB: b.train,
                        edgeId: a.train.currentEdgeId,
                        location: { x: (a.cx + b.cx) / 2, y: (a.cy + b.cy) / 2 },
                    });
                }
            }
        }
    }
    return results;
}
