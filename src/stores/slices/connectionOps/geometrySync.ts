/**
 * Geometry Sync Layer
 *
 * Ensures edge geometry stays synchronized with node positions.
 * This is a critical safety layer for maintaining data integrity.
 *
 * @module connectionOps/geometrySync
 */

import type { NodeId, EdgeId, TrackNode, TrackEdge } from '../../../types';

/**
 * Sync edge geometry to match node positions.
 *
 * This is a critical safety layer that ensures geometry never desyncs from nodes.
 * Call this after any mutation that changes node positions.
 *
 * For straight edges: geometry.start/end must match node positions
 * For arc edges: we verify endpoints match (arc center is more complex to sync)
 *
 * @param nodes - Current node state
 * @param edges - Current edge state
 * @returns New edges object with synced geometry
 */
export function syncGeometryToNodes(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>
): Record<EdgeId, TrackEdge> {
    const syncedEdges: Record<EdgeId, TrackEdge> = {};

    for (const [id, edge] of Object.entries(edges)) {
        const startNode = nodes[edge.startNodeId];
        const endNode = nodes[edge.endNodeId];

        if (!startNode || !endNode) {
            // Node missing - keep edge as-is (will fail validation)
            syncedEdges[id] = edge;
            continue;
        }

        if (edge.geometry.type === 'straight') {
            // For straight: always sync to node positions
            syncedEdges[id] = {
                ...edge,
                geometry: {
                    type: 'straight',
                    start: { ...startNode.position },
                    end: { ...endNode.position },
                }
            };
        } else {
            // For arc: geometry uses center + angles
            // The endpoints SHOULD match nodes - if not, log a warning
            // Full arc recalculation is complex, so we trust movePart did it correctly
            // but we validate the endpoints match
            const { center, radius, startAngle, endAngle } = edge.geometry;
            const expectedStart = {
                x: center.x + radius * Math.cos(startAngle * Math.PI / 180),
                y: center.y + radius * Math.sin(startAngle * Math.PI / 180),
            };
            const expectedEnd = {
                x: center.x + radius * Math.cos(endAngle * Math.PI / 180),
                y: center.y + radius * Math.sin(endAngle * Math.PI / 180),
            };

            const startDist = Math.hypot(expectedStart.x - startNode.position.x, expectedStart.y - startNode.position.y);
            const endDist = Math.hypot(expectedEnd.x - endNode.position.x, expectedEnd.y - endNode.position.y);

            // Allow 1px tolerance for floating point
            if (startDist > 1 || endDist > 1) {
                console.warn('[syncGeometry] Arc endpoints mismatch:', {
                    edgeId: id.slice(0, 8),
                    startDist: startDist.toFixed(2),
                    endDist: endDist.toFixed(2),
                });
            }

            syncedEdges[id] = edge;
        }
    }

    return syncedEdges;
}
