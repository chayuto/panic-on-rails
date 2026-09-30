/**
 * Connection Slice - Network Operations
 *
 * Handles connecting track pieces, moving networks, and switch toggling.
 * Orchestrates operations by delegating to specialized modules in connectionOps/.
 */

import type { SliceCreator, ConnectionSlice } from './types';
import { linkedPoints } from '../../utils/switchRouting';

// Import extracted operations
import { connectNodesOp } from './connectionOps/connect';
import { connectNetworksOp } from './connectionOps/network';
import { movePartOp } from './connectionOps/move';
import { logger } from '../../utils/logger';

/**
 * Creates the connection slice with network manipulation operations.
 */
export const createConnectionSlice: SliceCreator<ConnectionSlice> = (set) => ({
    /**
     * Connect two nodes together, merging them into one.
     * Used when placing a track that snaps to an existing one.
     * 
     * @param survivorNodeId - ID of the node to keep
     * @param removedNodeId - ID of the node to remove (will merge into survivor)
     */
    connectNodes: (survivorNodeId, removedNodeId) => {
        set((state) => {
            return connectNodesOp(
                state.nodes,
                state.edges,
                survivorNodeId,
                removedNodeId
            );
        });
    },

    /**
     * Connect two entire networks by moving one to align with the other.
     * 
     * @param anchorNodeId - Node in the stationary network
     * @param movingNodeId - Node in the moving network
     * @param movingEdgeId - Edge belonging to the moving network that connects to movingNodeId
     * @param rotationDelta - Rotation to apply to the moving network
     */
    connectNetworks: (anchorNodeId, movingNodeId, movingEdgeId, rotationDelta) => {
        set((state) => {
            return connectNetworksOp(
                state.nodes,
                state.edges,
                anchorNodeId,
                movingNodeId,
                movingEdgeId,
                rotationDelta
            );
        });
    },

    /**
     * Move a part and its connected network.
     * 
     * @param edgeId - ID of the part's primary edge
     * @param pivotNodeId - ID of the node to rotate around
     * @param targetPosition - New position for the pivot node
     * @param rotationDelta - Rotation change in degrees
     */
    movePart: (edgeId, pivotNodeId, targetPosition, rotationDelta) => {
        set((state) => {
            return movePartOp(
                state.nodes,
                state.edges,
                edgeId,
                pivotNodeId,
                targetPosition,
                rotationDelta
            );
        });
    },

    /**
     * Toggle the state of a switch/turnout.
     * 
     * @param nodeId - ID of the switch node
     */
    toggleSwitch: (nodeId) => {
        set((state) => {
            const node = state.nodes[nodeId];
            if (!node || node.type !== 'switch') {
                console.warn('[toggleSwitch] Node is not a switch:', nodeId.slice(0, 8));
                return state;
            }

            const newState: 0 | 1 = node.switchState === 0 ? 1 : 0;
            const moved = linkedPoints(node, state.nodes);
            logger.debug('toggleSwitch', 'Toggling switch:', {
                nodeId: nodeId.slice(0, 8),
                from: node.switchState,
                to: newState,
                linked: moved.length - 1,
            });

            const nodes = { ...state.nodes };
            for (const points of moved) nodes[points.id] = { ...points, switchState: newState };
            return { nodes };
        });
    },
});
