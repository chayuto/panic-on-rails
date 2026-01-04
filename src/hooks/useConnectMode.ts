/**
 * useConnectMode - Hook for Connect Mode interactions
 * 
 * Manages the 2-click workflow for connecting existing track pieces:
 * 1. First click: Select source endpoint (Part A)
 * 2. Second click: Select target endpoint (Part B), move Part B to connect
 */

import { useCallback } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useModeStore } from '../stores/useModeStore';
import { playSound } from '../utils/audioManager';
import { calculateRotationForConnection, validateConnection } from '../utils/connectTransform';
import type { NodeId } from '../types';

/**
 * Hook that provides connect mode functionality
 */
export function useConnectMode() {
    const { connectSource, setConnectSource, clearConnectSource, selectedSystem } = useEditorStore();
    const { nodes, edges, movePart, connectNodes } = useTrackStore();
    const { editSubMode, setEditSubMode } = useModeStore();

    /**
     * Check if a node is a valid connect target (open endpoint, different part from source)
     */
    const isValidConnectTarget = useCallback((nodeId: NodeId): boolean => {
        const node = nodes[nodeId];
        if (!node) return false;

        // Must be an open endpoint (exactly 1 connection)
        if (node.connections.length !== 1) return false;

        // If no source selected yet, any open endpoint is valid
        if (!connectSource) return true;

        // Must be different from source
        if (nodeId === connectSource.nodeId) return false;

        // Must be from a different part
        const sourceEdge = edges[connectSource.edgeId];
        const targetEdge = edges[node.connections[0]];

        if (!sourceEdge || !targetEdge) return false;
        if (sourceEdge.partId === targetEdge.partId) return false;

        return true;
    }, [nodes, edges, connectSource]);

    /**
     * Handle a node click in connect mode
     */
    const handleConnectModeNodeClick = useCallback((nodeId: NodeId) => {
        if (editSubMode !== 'connect') return;

        const node = nodes[nodeId];
        if (!node) return;

        // Node must be an open endpoint
        if (node.connections.length !== 1) {
            console.log('[useConnectMode] Node is not an open endpoint:', nodeId.slice(0, 8));
            return;
        }

        const edgeId = node.connections[0];
        const edge = edges[edgeId];
        if (!edge) return;

        // If no source selected, this is the first click
        if (!connectSource) {
            console.log('[useConnectMode] Setting source node:', {
                nodeId: nodeId.slice(0, 8),
                edgeId: edgeId.slice(0, 8),
            });
            setConnectSource({ nodeId, edgeId });
            return;
        }

        // This is the second click - validate and connect
        const sourceNode = nodes[connectSource.nodeId];
        const targetNode = node;

        if (!sourceNode) {
            console.warn('[useConnectMode] Source node no longer exists');
            clearConnectSource();
            return;
        }

        // Validate connection
        const validation = validateConnection(sourceNode, targetNode, edges);
        if (!validation.isValid) {
            console.warn('[useConnectMode] Invalid connection:', validation.error);
            playSound('bounce'); // Rejection sound
            return;
        }

        console.log('[useConnectMode] Connecting nodes:', {
            sourceNodeId: connectSource.nodeId.slice(0, 8),
            targetNodeId: nodeId.slice(0, 8),
        });

        // Calculate the rotation needed
        const rotationDelta = calculateRotationForConnection(
            sourceNode.rotation,  // Target (Part A - anchor)
            targetNode.rotation   // Source (Part B - moving)
        );

        console.log('[useConnectMode] Rotation delta:', rotationDelta);

        // Move Part B to connect to Part A
        // The target node (Part B) should end up at source node's position
        movePart(
            edgeId,                     // Any edge of Part B
            nodeId,                     // Pivot around the target node
            sourceNode.position,        // Move to source node's position
            rotationDelta              // Rotate to align facades
        );

        // Merge the nodes
        // After move, targetNode is at sourceNode's position
        // We merge targetNode INTO sourceNode (sourceNode survives)
        connectNodes(connectSource.nodeId, nodeId, edgeId);

        // Play success sound
        playSound(selectedSystem === 'wooden' ? 'snap-wooden' : 'snap-nscale');

        // Clear source for next connection
        clearConnectSource();

        console.log('[useConnectMode] Connection complete!');
    }, [editSubMode, nodes, edges, connectSource, setConnectSource, clearConnectSource, movePart, connectNodes, selectedSystem]);

    /**
     * Cancel current connection (clear source)
     */
    const cancelConnect = useCallback(() => {
        clearConnectSource();
    }, [clearConnectSource]);

    /**
     * Exit connect mode
     */
    const exitConnectMode = useCallback(() => {
        clearConnectSource();
        setEditSubMode('select');
    }, [clearConnectSource, setEditSubMode]);

    return {
        connectSource,
        isValidConnectTarget,
        handleConnectModeNodeClick,
        cancelConnect,
        exitConnectMode,
    };
}
