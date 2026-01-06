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
import { calculateRotationForConnection, validateConnection, getNodeConnectorType, getNodeFacadeFromEdge } from '../utils/connectTransform';
import type { NodeId } from '../types';

/**
 * Hook that provides connect mode functionality
 */
export function useConnectMode() {
    const { connectSource, setConnectSource, clearConnectSource, selectedSystem } = useEditorStore();
    const { nodes, edges, connectNetworks } = useTrackStore();
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

        // Validate connection (includes cycle detection)
        const validation = validateConnection(sourceNode, targetNode, edges, nodes);
        if (!validation.isValid) {
            console.warn('[useConnectMode] Invalid connection:', validation.error);
            playSound('bounce'); // Rejection sound
            return;
        }

        console.log('[useConnectMode] Connecting nodes:', {
            sourceNodeId: connectSource.nodeId.slice(0, 8),
            targetNodeId: nodeId.slice(0, 8),
        });

        // Determine connector types to detect Y-junction vs linear connection
        const sourceConnectorType = getNodeConnectorType(connectSource.nodeId, edges[connectSource.edgeId]);
        const targetConnectorType = getNodeConnectorType(nodeId, edge);
        const isYJunction = sourceConnectorType === targetConnectorType;

        console.log('[useConnectMode] Connection types:', {
            sourceType: sourceConnectorType,
            targetType: targetConnectorType,
            isYJunction,
        });

        // Calculate the rotation needed
        // Derive facades from geometry for accuracy (stored rotation is unreliable for junctions)
        const sourceEdge = edges[connectSource.edgeId];
        const sourceFacade = getNodeFacadeFromEdge(connectSource.nodeId, sourceEdge);
        const targetFacade = getNodeFacadeFromEdge(nodeId, edge);

        console.log('[useConnectMode] Derived facades:', {
            sourceFacade,
            targetFacade,
            storedSourceRotation: sourceNode.rotation,
            storedTargetRotation: targetNode.rotation,
        });

        const rotationDelta = calculateRotationForConnection(
            sourceFacade,   // Target (Part A - anchor) - derived from geometry
            targetFacade,   // Source (Part B - moving) - derived from geometry
            isYJunction
        );

        console.log('[useConnectMode] Rotation delta:', rotationDelta);

        // V2: Use atomic connectNetworks instead of movePart + connectNodes
        // This ensures the entire operation is atomic - no partial state
        connectNetworks(
            connectSource.nodeId,  // Anchor node (Part A - stays fixed)
            nodeId,               // Moving node (Part B - will be moved and merged)
            edgeId,              // Edge from Part B
            rotationDelta        // Rotation to align facades
        );

        // Play success sound
        playSound(selectedSystem === 'wooden' ? 'snap-wooden' : 'snap-nscale');

        // Clear source for next connection
        clearConnectSource();

        console.log('[useConnectMode] Connection complete!');
    }, [editSubMode, nodes, edges, connectSource, setConnectSource, clearConnectSource, connectNetworks, selectedSystem]);

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
