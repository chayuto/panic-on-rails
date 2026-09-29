/**
 * Merge one node into another: the shared step of every way two pieces of
 * track get joined.
 */

import type { NodeId, EdgeId, TrackNode, TrackEdge } from '../../../types';
import { nodeIndex, spatialIndex, getEdgeBounds } from '../spatialHelpers';

/**
 * Merge `removedNodeId` into `survivorNodeId`, in place on maps the caller
 * has already copied. Every edge at the removed node now ends at the
 * survivor: a turnout's entry carries two. Points survive the merge
 * whichever node carried them.
 */
export function mergeNodeInto(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>,
    survivorNodeId: NodeId,
    removedNodeId: NodeId
): void {
    const survivor = nodes[survivorNodeId];
    const removed = nodes[removedNodeId];
    if (!survivor || !removed || survivorNodeId === removedNodeId) return;

    for (const edgeId of removed.connections) {
        const edge = edges[edgeId];
        if (!edge) continue;
        const atStart = edge.startNodeId === removedNodeId;
        if (!atStart && edge.endNodeId !== removedNodeId) continue;
        // Straights store their ends; arcs derive theirs from centre and angles
        let geometry = edge.geometry;
        if (geometry.type === 'straight') {
            geometry = atStart ? { ...geometry, start: survivor.position } : { ...geometry, end: survivor.position };
        }
        edges[edgeId] = atStart
            ? { ...edge, startNodeId: survivorNodeId, geometry }
            : { ...edge, endNodeId: survivorNodeId, geometry };
        spatialIndex.remove(edgeId);
        spatialIndex.insert(edgeId, getEdgeBounds(edges[edgeId]), edgeId);
    }

    const connections = [...survivor.connections, ...removed.connections.filter(id => !survivor.connections.includes(id))];
    const merged: TrackNode = {
        ...survivor,
        connections,
        type: survivor.type === 'switch' || removed.type === 'switch'
            ? 'switch'
            : connections.length >= 2 ? 'junction' : 'endpoint',
    };
    if (survivor.type !== 'switch' && removed.type === 'switch') {
        // The new piece brought the points
        merged.switchState = removed.switchState;
        merged.switchBranches = removed.switchBranches;
        if (removed.switchGroup) merged.switchGroup = removed.switchGroup;
    }
    nodes[survivorNodeId] = merged;

    delete nodes[removedNodeId];
    nodeIndex.remove(removedNodeId);
}
