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
import { BOGIE_SPACING, CAR_PITCH, ROLLING_STOCK } from '../config/rollingStock';

export interface CarPose {
    /** Car index: 0 is the locomotive */
    index: number;
    /** Centre of the car body */
    x: number;
    y: number;
    /** Heading of the car body, front to back reversed (degrees, 0 = east) */
    rotation: number;
}

/** A point on the track: an edge and a distance along it. */
interface TrackPoint {
    edgeId: EdgeId;
    distance: number;
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
            // Leaving the turnout's routes backward: out through its entry
            return candidates.find(id => id !== main && id !== branch) ?? candidates[0];
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

    for (let guard = 0; guard < 64; guard++) {
        const available = direction === 1 ? distance : edge.length - distance;
        if (available >= remaining) {
            return { edgeId: edge.id, distance: direction === 1 ? distance - remaining : distance + remaining };
        }
        remaining -= available;
        const nodeId = direction === 1 ? edge.startNodeId : edge.endNodeId;
        const node = nodes[nodeId];
        const prevId = node ? previousEdge(node, edge.id, train.trail?.[step]) : undefined;
        const prev = prevId ? edges[prevId] : undefined;
        step++;
        if (!prev) {
            // Dead end behind the train: bunch up at the buffer
            return { edgeId: edge.id, distance: direction === 1 ? 0 : edge.length };
        }
        // We arrived at `node` from `prev`: moving toward its end means direction +1
        direction = prev.endNodeId === nodeId ? 1 : -1;
        distance = direction === 1 ? prev.length : 0;
        edge = prev;
    }
    return { edgeId: edge.id, distance };
}

/**
 * Poses of every car in a train (index 0 = locomotive), or [] if the train
 * isn't on the track.
 */
export function getCarPoses(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>,
    geometryOf: GeometryLookup = frameGeometry(edges, nodes)
): CarPose[] {
    const count = Math.max(1, train.carriageCount ?? 1);
    const pitch = train.carriageSpacing ?? CAR_PITCH;
    const place = (behind: number): Vector2 | null => {
        const p = walkBack(train, behind, edges, nodes);
        if (!p) return null;
        const g = geometryOf(p.edgeId);
        return g ? pointOnEdge(g, edges[p.edgeId].length, p.distance) : null;
    };

    const poses: CarPose[] = [];
    for (let i = 0; i < count; i++) {
        const front = place(i * pitch);
        const rear = place(i * pitch + BOGIE_SPACING);
        if (!front || !rear) break;
        poses.push({
            index: i,
            x: (front.x + rear.x) / 2,
            y: (front.y + rear.y) / 2,
            rotation: (Math.atan2(front.y - rear.y, front.x - rear.x) * 180) / Math.PI,
        });
    }
    return poses;
}

/** Half the car length ahead of its centre: where the nose is. */
export const CAR_HALF_LENGTH = ROLLING_STOCK.CAR_LENGTH / 2;
