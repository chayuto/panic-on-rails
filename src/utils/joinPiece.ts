/**
 * Join a newly placed piece to the track it touches, the way dropping it in
 * the editor does. Kept out of the drop handler so tests can place pieces
 * exactly as a player does.
 */

import { useTrackStore } from '../stores/useTrackStore';
import { angleDifference } from './angle';
import { canJoin, isOpenEnd } from './graphAnalysis';
import type { EdgeId, NodeId, TrackNode } from '../types';

/** A little more than the snap tolerance, to catch near misses (mm). */
export const JOIN_DISTANCE = 10;
/** Connectors must face each other to within this (degrees), per the constitution. */
export const JOIN_FACING_TOLERANCE = 20;

/**
 * Join every open end of the piece `edgeId` belongs to (a turnout's three,
 * a double crossover's four) to an open end it now touches and faces.
 * Returns how many joints were made.
 */
export function joinPlacedPiece(edgeId: EdgeId): number {
    const { edges } = useTrackStore.getState();
    const placed = edges[edgeId];
    if (!placed) return 0;

    const pieceNodes = new Set<NodeId>(Object.values(edges)
        .filter(e => e.id === edgeId || (!!placed.placementId && e.placementId === placed.placementId))
        .flatMap(e => [e.startNodeId, e.endNodeId]));

    let joined = 0;
    for (const nodeId of pieceNodes) {
        // Each join can remove a node, so look again every time
        const state = useTrackStore.getState();
        const node = state.nodes[nodeId];
        if (!node || !isOpenEnd(node)) continue;

        let nearest: TrackNode | null = null;
        let nearestDistance = Infinity;
        for (const other of state.getOpenEndpoints()) {
            if (pieceNodes.has(other.id) || !canJoin(other, node)) continue;
            const distance = Math.hypot(other.position.x - node.position.x, other.position.y - node.position.y);
            const facingError = Math.abs(angleDifference(other.rotation, node.rotation) - 180);
            if (distance < JOIN_DISTANCE && distance < nearestDistance && facingError < JOIN_FACING_TOLERANCE) {
                nearest = other;
                nearestDistance = distance;
            }
        }
        if (nearest) {
            // The track already down keeps its node; the new piece's merges into it
            state.connectNodes(nearest.id, nodeId);
            joined++;
        }
    }
    return joined;
}
