/**
 * Where each car of a train sits.
 *
 * Every car rides on two bogies that stay on the rails; the body spans the
 * chord between them, so on a curve it cuts inside the track the way a
 * real model does. A train's position is its locomotive's front bogie, and
 * every other bogie trails behind it along the route the train actually
 * took (`train.trail`), so cars follow it through turnouts.
 */

import type { EdgeId, NodeId, TrackEdge, TrackGeometry, TrackNode, Train, Vector2 } from '../types';
import { deriveWorldGeometry } from './geometry';
import { BOGIE_INSET_RATIO, BOGIE_SPACING, CAR_PITCH, ROLLING_STOCK } from '../config/rollingStock';
import { heightAlong } from './elevation';
import { sizeOf } from '../config/scales';

export interface CarPose {
    /** Place in the train as it runs: 0 leads */
    index: number;
    /** Centre of the car body */
    x: number;
    y: number;
    /** Heading of the car body, front to back reversed (degrees, 0 = east) */
    rotation: number;
    /** Body length, end to end (mm) */
    length: number;
    /** How high the track under it stands (mm above the baseboard) */
    height: number;
}

/** One car of a train, where it rides behind the leading car's front bogie (mm). */
interface CarSpan {
    /** Its front bogie, behind the leading car's */
    offset: number;
    /** From its front bogie to its rear one */
    bogies: number;
    /** Its body, end to end */
    length: number;
}

/**
 * A train's cars front to back as it runs: its model's own lengths,
 * reversed while the locomotive pushes, or the short uniform car.
 */
function carSpans(train: Train): CarSpan[] {
    const size = sizeOf(train.scale);
    if (train.carLengths?.length) {
        const gap = ROLLING_STOCK.GAP * size;
        const lengths = train.locoLeading === false ? [...train.carLengths].reverse() : train.carLengths;
        const inset = (body: number) => body * BOGIE_INSET_RATIO;
        const leadInset = inset(lengths[0] - gap);
        // Each car's front coupler, behind the leading car's
        let coupler = 0;
        return lengths.map(overCouplers => {
            const body = overCouplers - gap;
            const span = { offset: coupler + inset(body) - leadInset, bogies: body - 2 * inset(body), length: body };
            coupler += overCouplers;
            return span;
        });
    }
    const count = Math.max(1, train.carriageCount ?? 1);
    const pitch = train.carriageSpacing ?? CAR_PITCH * size;
    const span = { bogies: BOGIE_SPACING * size, length: ROLLING_STOCK.CAR_LENGTH * size };
    return Array.from({ length: count }, (_, i) => ({ ...span, offset: i * pitch }));
}

/** How many cars a train has, locomotive included. */
export function carCount(train: Pick<Train, 'carLengths' | 'carriageCount'>): number {
    return train.carLengths?.length || Math.max(1, train.carriageCount ?? 1);
}

/** A point on the track: an edge and a distance along it. */
interface TrackPoint {
    edgeId: EdgeId;
    distance: number;
    /** The train's direction of travel on that edge */
    direction: 1 | -1;
    /** Edges walked through to get there, starting with the train's own */
    path: EdgeId[];
    /** The track ran out behind the train first: the point is at its end */
    bunched?: true;
}

/** World geometry per edge, derived once per frame. */
export type GeometryLookup = (edgeId: EdgeId) => TrackGeometry | null;

/** Build a memoized geometry lookup for one frame. */
export function frameGeometry(edges: Record<EdgeId, TrackEdge>, nodes: Record<NodeId, TrackNode>): GeometryLookup {
    const cache = new Map<EdgeId, TrackGeometry | null>();
    return (edgeId) => {
        let g = cache.get(edgeId);
        if (g === undefined) {
            const edge = edges[edgeId];
            g = edge ? deriveWorldGeometry(edge, nodes) : null;
            cache.set(edgeId, g);
        }
        return g;
    };
}

/** World position of a point `distance` along an edge from its start node. */
export function pointOnEdge(g: TrackGeometry, length: number, distance: number): Vector2 {
    const t = length > 0 ? Math.max(0, Math.min(1, distance / length)) : 0;
    if (g.type === 'straight') {
        return { x: g.start.x + (g.end.x - g.start.x) * t, y: g.start.y + (g.end.y - g.start.y) * t };
    }
    const a = ((g.startAngle + (g.endAngle - g.startAngle) * t) * Math.PI) / 180;
    return { x: g.center.x + g.radius * Math.cos(a), y: g.center.y + g.radius * Math.sin(a) };
}

/**
 * The edge before `edge` when walking backward into `node`: the train's own
 * history if it matches, otherwise the route the turnout is set for.
 */
function previousEdge(node: TrackNode, edgeId: EdgeId, remembered: EdgeId | undefined): EdgeId | undefined {
    const candidates = node.connections.filter(id => id !== edgeId);
    if (remembered && candidates.includes(remembered)) return remembered;
    if (node.type === 'switch' && node.switchBranches) {
        const [main, branch] = node.switchBranches;
        if (edgeId === main || edgeId === branch) {
            // Leaving the turnout's routes backward: out through its entry,
            // or nothing if no track is joined there
            return candidates.find(id => id !== main && id !== branch);
        }
        // Backing into the turnout from its entry: the route it's set for
        return node.switchState === 1 ? branch : main;
    }
    return candidates[0];
}

/** Walk `behind` mm back along the train's route from its front bogie. */
function walkBack(
    train: Train,
    behind: number,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): TrackPoint | null {
    let edge = edges[train.currentEdgeId];
    if (!edge) return null;
    let distance = train.distanceAlongEdge;
    let direction = train.direction;
    let remaining = behind;
    let step = 0;
    const path: EdgeId[] = [edge.id];

    for (let guard = 0; guard < 64; guard++) {
        const available = direction === 1 ? distance : edge.length - distance;
        if (available >= remaining) {
            return { edgeId: edge.id, distance: direction === 1 ? distance - remaining : distance + remaining, direction, path };
        }
        remaining -= available;
        const nodeId = direction === 1 ? edge.startNodeId : edge.endNodeId;
        const node = nodes[nodeId];
        const prevId = node ? previousEdge(node, edge.id, train.trail?.[step]) : undefined;
        const prev = prevId ? edges[prevId] : undefined;
        step++;
        if (!prev) {
            // Dead end behind the train: bunch up at the buffer
            return { edgeId: edge.id, distance: direction === 1 ? 0 : edge.length, direction, path, bunched: true };
        }
        // We arrived at `node` from `prev`: moving toward its end means direction +1
        direction = prev.endNodeId === nodeId ? 1 : -1;
        distance = direction === 1 ? prev.length : 0;
        edge = prev;
        path.push(edge.id);
    }
    return { edgeId: edge.id, distance, direction, path };
}

/** From the leading car's front bogie to the last car's rear bogie (mm). */
export function consistLength(train: Train): number {
    const spans = carSpans(train);
    const last = spans[spans.length - 1];
    return last.offset + last.bogies;
}

/**
 * How far a train reaches from its leading car's front bogie (mm): ahead,
 * to the front of that car's body, and behind, to the back of the last one.
 */
export function trainReach(train: Train): { ahead: number; behind: number } {
    const spans = carSpans(train);
    const first = spans[0];
    const last = spans[spans.length - 1];
    return {
        ahead: (first.length - first.bogies) / 2 - first.offset,
        behind: last.offset + last.bogies + (last.length - last.bogies) / 2,
    };
}

/** The pieces of track under a train, its own first, back to the one under its last car. */
export function edgesUnder(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): EdgeId[] {
    return walkBack(train, trainReach(train).behind, edges, nodes)?.path ?? [];
}

/**
 * Whether the whole train stands on the track: there's track under every
 * car, from the front of the first to the back of the last, before the
 * track ends. Otherwise its end cars would bunch up at a buffer, off the
 * rails.
 */
export function fitsOnTrack(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): boolean {
    const { ahead, behind } = trainReach(train);
    // A micrometre's slack: a train whose end is exactly at a buffer fits
    const slack = 1e-3;
    const rear = walkBack(train, behind - slack, edges, nodes);
    // Ahead is behind a train facing the other way
    const front = walkBack({ ...train, direction: train.direction === 1 ? -1 : 1, trail: undefined }, ahead - slack, edges, nodes);
    return !!rear && !rear.bunched && !!front && !front.bunched;
}

/**
 * Turn a train back without moving a single car: its leading end becomes
 * the far end of the consist, facing the other way, and the locomotive —
 * which stays where it is — changes from leading to pushing (or back).
 */
export function reverseConsist(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): Train {
    const tail = walkBack(train, consistLength(train), edges, nodes);
    const flipped = { locoLeading: train.locoLeading === false, heldAtSignal: false, reverseRequested: false };
    if (!tail) return { ...train, ...flipped, direction: -train.direction as 1 | -1, trail: [] };
    return {
        ...train,
        ...flipped,
        currentEdgeId: tail.edgeId,
        distanceAlongEdge: tail.distance,
        direction: -tail.direction as 1 | -1,
        // Behind the new front is the stretch the train stands on, walked the other way
        trail: tail.path.slice(0, -1).reverse(),
    };
}

/**
 * Poses of every car in a train, front to back as it runs (the locomotive
 * leads, or pushes from the back), or [] if the train isn't on the track.
 */
export function getCarPoses(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>,
    geometryOf: GeometryLookup = frameGeometry(edges, nodes)
): CarPose[] {
    const place = (behind: number): (Vector2 & { height: number }) | null => {
        const p = walkBack(train, behind, edges, nodes);
        if (!p) return null;
        const g = geometryOf(p.edgeId);
        const edge = edges[p.edgeId];
        return g ? { ...pointOnEdge(g, edge.length, p.distance), height: heightAlong(edge, p.distance, nodes) } : null;
    };

    const poses: CarPose[] = [];
    for (const [i, span] of carSpans(train).entries()) {
        const front = place(span.offset);
        const rear = place(span.offset + span.bogies);
        if (!front || !rear) break;
        poses.push({
            index: i,
            x: (front.x + rear.x) / 2,
            y: (front.y + rear.y) / 2,
            rotation: (Math.atan2(front.y - rear.y, front.x - rear.x) * 180) / Math.PI,
            length: span.length,
            height: (front.height + rear.height) / 2,
        });
    }
    return poses;
}
