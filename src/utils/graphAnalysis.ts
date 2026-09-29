/**
 * Track graph analysis helpers.
 */

import type { EdgeId, NodeId, TrackEdge } from '../types';

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
