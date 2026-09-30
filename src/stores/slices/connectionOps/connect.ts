/**
 * Connect Nodes Operation
 *
 * Handles merging two nodes when a connection is formed.
 */

import type { NodeId, EdgeId, TrackNode, TrackEdge } from '../../../types';
import { mergeNodeInto } from './merge';
import { logger } from '../../../utils/logger';

/**
 * Connects two nodes by merging the removed node into the survivor node.
 * Every edge at the removed node is re-pointed to the survivor.
 */
export function connectNodesOp(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>,
    survivorNodeId: NodeId,
    removedNodeId: NodeId
): { nodes: Record<NodeId, TrackNode>; edges: Record<EdgeId, TrackEdge> } {
    logger.debug('connectNodesOp', 'Starting node merge:', {
        survivorNodeId: survivorNodeId.slice(0, 8),
        removedNodeId: removedNodeId.slice(0, 8),
    });

    if (!nodes[survivorNodeId] || !nodes[removedNodeId]) {
        console.warn('[connectNodesOp] Node not found:', {
            survivorExists: !!nodes[survivorNodeId],
            removedExists: !!nodes[removedNodeId],
        });
        return { nodes, edges };
    }

    const newNodes = { ...nodes };
    const newEdges = { ...edges };
    mergeNodeInto(newNodes, newEdges, survivorNodeId, removedNodeId);

    logger.debug('connectNodesOp', 'Merge complete:', {
        totalNodes: Object.keys(newNodes).length,
        totalEdges: Object.keys(newEdges).length,
        survivorConnectionsNow: newNodes[survivorNodeId].connections.length,
    });

    return { nodes: newNodes, edges: newEdges };
}
