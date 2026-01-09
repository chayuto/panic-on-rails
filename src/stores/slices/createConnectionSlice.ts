/**
 * Connection Slice - Network Operations
 *
 * Handles connecting track pieces, moving networks, and switch toggling.
 * Orchestrates operations by delegating to specialized modules in connectionOps/.
 */

import type { SliceCreator, ConnectionSlice } from './types';

// Import extracted operations
import { connectNodesOp } from './connectionOps/connect';
import { connectNetworksOp } from './connectionOps/network';
import { movePartOp } from './connectionOps/move';

/**
 * Creates the connection slice with network manipulation operations.
 */
export const createConnectionSlice: SliceCreator<ConnectionSlice> = (set) => ({
    connectNodes: (survivorNodeId, removedNodeId, newEdgeId) => {
        set((state) => {
            return connectNodesOp(
                state.nodes,
                state.edges,
                survivorNodeId,
                removedNodeId,
                newEdgeId
            );
        });
    },

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

    toggleSwitch: (nodeId) => {
        set((state) => {
            const node = state.nodes[nodeId];
            if (!node || node.type !== 'switch') {
                console.warn('[toggleSwitch] Node is not a switch:', nodeId.slice(0, 8));
                return state;
            }

            const newState: 0 | 1 = node.switchState === 0 ? 1 : 0;
            console.log('[toggleSwitch] Toggling switch:', {
                nodeId: nodeId.slice(0, 8),
                from: node.switchState,
                to: newState,
            });

            return {
                nodes: {
                    ...state.nodes,
                    [nodeId]: {
                        ...node,
                        switchState: newState,
                    },
                },
            };
        });
    },
});
