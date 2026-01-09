/**
 * Connect Nodes Operation
 * 
 * Handles merging two nodes when a connection is formed.
 */

import type { NodeId, EdgeId, TrackNode, TrackEdge } from '../../../types';
import { nodeIndex } from '../spatialHelpers';

/**
 * Connects two nodes by merging the removed node into the survivor node.
 * Updates the new edge to point to the survivor node.
 */
export function connectNodesOp(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>,
    survivorNodeId: NodeId,
    removedNodeId: NodeId,
    newEdgeId: EdgeId
): { nodes: Record<NodeId, TrackNode>; edges: Record<EdgeId, TrackEdge> } {
    console.log('[connectNodesOp] Starting node merge:', {
        survivorNodeId: survivorNodeId.slice(0, 8),
        removedNodeId: removedNodeId.slice(0, 8),
        newEdgeId: newEdgeId.slice(0, 8),
    });

    const survivorNode = nodes[survivorNodeId];
    const removedNode = nodes[removedNodeId];

    if (!survivorNode || !removedNode) {
        console.warn('[connectNodesOp] Node not found:', {
            survivorExists: !!survivorNode,
            removedExists: !!removedNode,
        });
        return { nodes, edges };
    }

    const newNodes = { ...nodes };
    const newEdges = { ...edges };

    // Update the new edge to point to survivor instead of removed node
    const newEdge = newEdges[newEdgeId];
    if (newEdge) {
        const survivorPos = newNodes[survivorNodeId].position;

        if (newEdge.startNodeId === removedNodeId) {
            // Update reference and sync geometry
            let updatedGeometry = newEdge.geometry;
            if (newEdge.geometry.type === 'straight') {
                updatedGeometry = { ...newEdge.geometry, start: survivorPos };
            }
            // For arcs: geometry uses center + angles, endpoints are derived
            // The arc geometry should already be correct from movePart

            newEdges[newEdgeId] = {
                ...newEdge,
                startNodeId: survivorNodeId,
                geometry: updatedGeometry
            };
        } else if (newEdge.endNodeId === removedNodeId) {
            let updatedGeometry = newEdge.geometry;
            if (newEdge.geometry.type === 'straight') {
                updatedGeometry = { ...newEdge.geometry, end: survivorPos };
            }

            newEdges[newEdgeId] = {
                ...newEdge,
                endNodeId: survivorNodeId,
                geometry: updatedGeometry
            };
        }
    }

    // Add the new edge connection to survivor
    newNodes[survivorNodeId] = {
        ...survivorNode,
        connections: [...survivorNode.connections, newEdgeId],
        // Upgrade to junction if now has 2+ connections
        type: survivorNode.connections.length >= 1 ? 'junction' : 'endpoint',
    };

    // Delete the removed node and remove from spatial index
    delete newNodes[removedNodeId];
    nodeIndex.remove(removedNodeId);

    console.log('[connectNodesOp] Merge complete:', {
        totalNodes: Object.keys(newNodes).length,
        totalEdges: Object.keys(newEdges).length,
        survivorConnectionsNow: newNodes[survivorNodeId].connections.length,
    });

    return { nodes: newNodes, edges: newEdges };
}
