/**
 * Join a newly placed piece to the track it touches, the way dropping it in
 * the editor does. Kept out of the drop handler so tests can place pieces
 * exactly as a player does.
 */

import { useTrackStore } from '../stores/useTrackStore';
import { angleDifference } from './angle';
import { canJoin, isOpenEnd } from './graphAnalysis';
import { heightOf } from './elevation';
import type { EdgeId, NodeId, TrackNode, Vector2 } from '../types';

/** A little more than the snap tolerance, to catch near misses (mm). */
export const JOIN_DISTANCE = 10;
/** Connectors must face each other to within this (degrees), per the constitution. */
export const JOIN_FACING_TOLERANCE = 20;

/** Every node of the piece `edgeId` belongs to. */
function nodesOfPiece(edgeId: EdgeId): Set<NodeId> {
    const { edges } = useTrackStore.getState();
    const placed = edges[edgeId];
    if (!placed) return new Set();
    return new Set<NodeId>(Object.values(edges)
        .filter(e => e.id === edgeId || (!!placed.placementId && e.placementId === placed.placementId))
        .flatMap(e => [e.startNodeId, e.endNodeId]));
}

/** Where the piece `edgeId` belongs to can still be built on from. */
export function openEndsOfPiece(edgeId: EdgeId): Vector2[] {
    const { nodes } = useTrackStore.getState();
    return [...nodesOfPiece(edgeId)].map(id => nodes[id]).filter(n => n && isOpenEnd(n)).map(n => n.position);
}

/** The open end nearest `node` that it touches and faces, at any height. */
function touching(node: TrackNode, others: TrackNode[], pieceNodes: Set<NodeId>): TrackNode | null {
    let nearest: TrackNode | null = null;
    let nearestDistance = Infinity;
    for (const other of others) {
        if (pieceNodes.has(other.id)) continue;
        const distance = Math.hypot(other.position.x - node.position.x, other.position.y - node.position.y);
        const facingError = Math.abs(angleDifference(other.rotation, node.rotation) - 180);
        if (distance < JOIN_DISTANCE && distance < nearestDistance && facingError < JOIN_FACING_TOLERANCE) {
            nearest = other;
            nearestDistance = distance;
        }
    }
    return nearest;
}

/**
 * A piece set down on the baseboard against raised track is lifted, level,
 * to meet it, as a modeler would put it on piers of the same height.
 */
function liftToMeet(pieceNodes: Set<NodeId>): void {
    const state = useTrackStore.getState();
    const own = [...pieceNodes].map(id => state.nodes[id]).filter((n): n is TrackNode => !!n);
    if (own.some(n => heightOf(n) > 0)) return;
    const others = state.getOpenEndpoints();
    for (const node of own) {
        if (!isOpenEnd(node)) continue;
        const target = touching(node, others, pieceNodes);
        const height = heightOf(target ?? undefined);
        if (target && height > 0) {
            state.setNodeHeights(Object.fromEntries(own.map(n => [n.id, height])));
            return;
        }
    }
}

/**
 * Join every open end of the piece `edgeId` belongs to (a turnout's three,
 * a double crossover's four) to an open end it now touches and faces, at
 * the same height. Set down against raised track, the piece is lifted to
 * meet it first. Returns how many joints were made.
 */
export function joinPlacedPiece(edgeId: EdgeId): number {
    const pieceNodes = nodesOfPiece(edgeId);
    liftToMeet(pieceNodes);

    let joined = 0;
    for (const nodeId of pieceNodes) {
        // Each join can remove a node, so look again every time
        const state = useTrackStore.getState();
        const node = state.nodes[nodeId];
        if (!node || !isOpenEnd(node)) continue;

        const nearest = touching(node, state.getOpenEndpoints().filter(other => canJoin(other, node)), pieceNodes);
        if (nearest) {
            // The track already down keeps its node; the new piece's merges into it
            state.connectNodes(nearest.id, nodeId);
            joined++;
        }
    }
    return joined;
}
