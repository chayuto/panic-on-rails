/**
 * Track graph analysis helpers.
 */

import type { EdgeId, NodeId, TrackEdge, TrackNode } from '../types';
import { sameHeight } from './elevation';

/**
 * Whether more track can be joined here: a plain end, or points with
 * nothing joined on their far side. A buffer stop is a dead end, not an
 * open one.
 */
export function isOpenEnd(node: TrackNode): boolean {
    if (node.bumper) return false;
    if (node.connections.length === 1) return true;
    const branches = node.switchBranches;
    return node.type === 'switch' && !!branches && node.connections.every(id => branches.includes(id));
}

/**
 * Two open ends can be joined if they're level with each other, unless
 * both are points: one joint holds one set.
 */
export function canJoin(a: TrackNode, b: TrackNode): boolean {
    return a.id !== b.id && isOpenEnd(a) && isOpenEnd(b) && !(a.type === 'switch' && b.type === 'switch') && sameHeight(a, b);
}

/**
 * Where two steps of one piece's own track meet (a curved turnout's
 * straight and arc, say): not a joint the player made.
 */
export function isInsidePiece(node: TrackNode, edges: Record<EdgeId, TrackEdge>): boolean {
    if (node.type === 'switch' || node.connections.length < 2) return false;
    const piece = edges[node.connections[0]]?.placementId;
    return !!piece && node.connections.every(id => edges[id]?.placementId === piece);
}

/**
 * True if the track contains a closed loop, i.e. the graph has a cycle, so
 * a train can run round without hitting a dead end. Union-find over edges:
 * an edge whose two nodes are already connected closes a cycle.
 */
export function hasClosedLoop(edges: Record<EdgeId, TrackEdge>): boolean {
    const parent = new Map<NodeId, NodeId>();
    const find = (n: NodeId): NodeId => {
        let root = n;
        while (parent.has(root) && parent.get(root) !== root) root = parent.get(root)!;
        // Path compression
        let cur = n;
        while (cur !== root) {
            const next = parent.get(cur)!;
            parent.set(cur, root);
            cur = next;
        }
        return root;
    };

    for (const edge of Object.values(edges)) {
        if (!parent.has(edge.startNodeId)) parent.set(edge.startNodeId, edge.startNodeId);
        if (!parent.has(edge.endNodeId)) parent.set(edge.endNodeId, edge.endNodeId);
        const a = find(edge.startNodeId);
        const b = find(edge.endNodeId);
        if (a === b) return true;
        parent.set(a, b);
    }
    return false;
}
