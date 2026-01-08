/**
 * Layout Integrity Validation
 *
 * Validates that the track graph is internally consistent.
 * Call this in development to catch bugs early.
 *
 * @module connectionOps/validation
 */

import type { NodeId, EdgeId, TrackNode, TrackEdge } from '../../../types';

/**
 * Validate layout integrity - check for data corruption.
 *
 * Call this in development to catch bugs early.
 * Returns list of error messages (empty = valid).
 */
export function validateLayoutIntegrity(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>
): string[] {
    const errors: string[] = [];

    // Check 1: All edges reference existing nodes
    for (const [edgeId, edge] of Object.entries(edges)) {
        if (!nodes[edge.startNodeId]) {
            errors.push(`Edge ${edgeId.slice(0, 8)} references missing startNode ${edge.startNodeId.slice(0, 8)}`);
        }
        if (!nodes[edge.endNodeId]) {
            errors.push(`Edge ${edgeId.slice(0, 8)} references missing endNode ${edge.endNodeId.slice(0, 8)}`);
        }
    }

    // Check 2: All node connections reference existing edges
    for (const [nodeId, node] of Object.entries(nodes)) {
        for (const edgeId of node.connections) {
            if (!edges[edgeId]) {
                errors.push(`Node ${nodeId.slice(0, 8)} references missing edge ${edgeId.slice(0, 8)}`);
            }
        }
    }

    // Check 3: Straight edge geometry matches node positions
    for (const [edgeId, edge] of Object.entries(edges)) {
        if (edge.geometry.type === 'straight') {
            const startNode = nodes[edge.startNodeId];
            const endNode = nodes[edge.endNodeId];

            if (startNode && endNode) {
                const startDist = Math.hypot(
                    edge.geometry.start.x - startNode.position.x,
                    edge.geometry.start.y - startNode.position.y
                );
                const endDist = Math.hypot(
                    edge.geometry.end.x - endNode.position.x,
                    edge.geometry.end.y - endNode.position.y
                );

                if (startDist > 0.1) {
                    errors.push(`Edge ${edgeId.slice(0, 8)} geometry.start doesn't match startNode (diff: ${startDist.toFixed(2)}px)`);
                }
                if (endDist > 0.1) {
                    errors.push(`Edge ${edgeId.slice(0, 8)} geometry.end doesn't match endNode (diff: ${endDist.toFixed(2)}px)`);
                }
            }
        }
    }

    // Check 4: Node types match connection count
    for (const [nodeId, node] of Object.entries(nodes)) {
        const connCount = node.connections.length;
        if (node.type === 'endpoint' && connCount !== 1) {
            errors.push(`Endpoint ${nodeId.slice(0, 8)} has ${connCount} connections (expected 1)`);
        }
        if (node.type === 'junction' && connCount < 2) {
            errors.push(`Junction ${nodeId.slice(0, 8)} has ${connCount} connections (expected 2+)`);
        }
    }

    if (errors.length > 0) {
        console.warn('[validateLayoutIntegrity] Found issues:', errors);
    }

    return errors;
}
