/**
 * Functional Tests for useConnectMode Logic
 * 
 * Tests the logic underlying the connect mode workflow.
 * Since useConnectMode uses React hooks, we test the store actions and
 * utility functions directly, following the pattern from useKeyboardShortcuts.test.ts.
 * 
 * The 2-click workflow logic:
 * 1. First click: Select source endpoint (Part A)
 * 2. Second click: Select target endpoint (Part B), connect
 * 
 * @created 2026-01-07
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTrackStore } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { useModeStore } from '../../stores/useModeStore';
import { useBudgetStore } from '../../stores/useBudgetStore';
import { validateConnection, getNodeConnectorType, getNodeFacadeFromEdge, calculateRotationForConnection } from '../../utils/connectTransform';
import type { NodeId } from '../../types';

// ===========================
// Test Helpers
// ===========================

/**
 * Helper to place a track and return useful info
 */
function placeTrack(position: { x: number; y: number }, rotation = 0) {
    const edgeId = useTrackStore.getState().addTrack('kato-20-020', position, rotation);
    if (!edgeId) throw new Error('Failed to place track');

    const edge = useTrackStore.getState().edges[edgeId];
    return {
        edgeId,
        edge,
        startNodeId: edge.startNodeId,
        endNodeId: edge.endNodeId,
    };
}

/**
 * Get current track store state
 */
function getTrackState() {
    return useTrackStore.getState();
}

/**
 * Get current editor store state
 */
function getEditorState() {
    return useEditorStore.getState();
}

/**
 * Get current mode store state
 */
function getModeState() {
    return useModeStore.getState();
}

/**
 * Simulate the connect mode validation logic from the hook
 */
function isValidConnectTarget(nodeId: NodeId): boolean {
    const { nodes, edges } = getTrackState();
    const { connectSource } = getEditorState();

    const node = nodes[nodeId];
    if (!node) return false;

    // Must be an open endpoint (exactly 1 connection)
    if (node.connections.length !== 1) return false;

    // If no source selected yet, any open endpoint is valid
    if (!connectSource) return true;

    // Must be different from source
    if (nodeId === connectSource.nodeId) return false;

    // Must be from a different physical track piece (different edge IDs)
    // Note: We compare edge IDs, NOT partId - partId is the catalog type
    const sourceEdgeId = connectSource.edgeId;
    const targetEdgeId = node.connections[0];

    if (!edges[sourceEdgeId] || !edges[targetEdgeId]) return false;
    if (sourceEdgeId === targetEdgeId) return false;

    return true;
}

/**
 * Simulate the first click logic - set source
 */
function handleFirstClick(nodeId: NodeId): boolean {
    const modeState = getModeState();
    if (modeState.editSubMode !== 'connect') return false;

    const { nodes } = getTrackState();
    const node = nodes[nodeId];
    if (!node) return false;

    // Node must be an open endpoint
    if (node.connections.length !== 1) return false;

    const edgeId = node.connections[0];

    // Set source
    useEditorStore.setState({
        connectSource: { nodeId, edgeId },
    });

    return true;
}

/**
 * Simulate the second click logic - connect
 * Returns true if connection was successful
 */
function handleSecondClick(targetNodeId: NodeId): { success: boolean; error?: string } {
    const { nodes, edges, connectNetworks } = getTrackState();
    const { connectSource } = getEditorState();

    if (!connectSource) {
        return { success: false, error: 'No source selected' };
    }

    const sourceNode = nodes[connectSource.nodeId];
    const targetNode = nodes[targetNodeId];

    if (!sourceNode) {
        // Source no longer exists, clear it
        useEditorStore.setState({ connectSource: null });
        return { success: false, error: 'Source node no longer exists' };
    }

    if (!targetNode) {
        return { success: false, error: 'Target node does not exist' };
    }

    // Validate connection
    const validation = validateConnection(sourceNode, targetNode, edges, nodes);
    if (!validation.isValid) {
        return { success: false, error: validation.error };
    }

    // Get edge info
    const targetEdgeId = targetNode.connections[0];
    const sourceEdge = edges[connectSource.edgeId];
    const targetEdge = edges[targetEdgeId];

    if (!sourceEdge || !targetEdge) {
        return { success: false, error: 'Could not find edges' };
    }

    // Calculate rotation
    const sourceFacade = getNodeFacadeFromEdge(connectSource.nodeId, sourceEdge);
    const targetFacade = getNodeFacadeFromEdge(targetNodeId, targetEdge);
    const sourceConnectorType = getNodeConnectorType(connectSource.nodeId, sourceEdge);
    const targetConnectorType = getNodeConnectorType(targetNodeId, targetEdge);
    const isYJunction = sourceConnectorType === targetConnectorType;
    const rotationDelta = calculateRotationForConnection(sourceFacade, targetFacade, isYJunction);

    // Perform connection
    connectNetworks(
        connectSource.nodeId,
        targetNodeId,
        targetEdgeId,
        rotationDelta
    );

    // Clear source
    useEditorStore.setState({ connectSource: null });

    return { success: true };
}

// ===========================
// Test Suite
// ===========================

describe('useConnectMode Logic', () => {
    beforeEach(() => {
        // Reset all stores
        useTrackStore.getState().clearLayout();
        useBudgetStore.getState().reset();
        useModeStore.setState({
            primaryMode: 'edit',
            editSubMode: 'connect',
            simulateSubMode: 'observe',
        });
        useEditorStore.setState({
            connectSource: null,
            selectedSystem: 'n-scale',
        });
        vi.clearAllMocks();
    });

    // ===========================
    // isValidConnectTarget Tests
    // ===========================

    describe('isValidConnectTarget', () => {
        it('should return false for non-existent node', () => {
            expect(isValidConnectTarget('non-existent-node' as NodeId)).toBe(false);
        });

        it('should return false for node with 0 connections (isolated)', () => {
            const track = placeTrack({ x: 100, y: 100 });

            // Manually disconnect the start node
            useTrackStore.setState((state) => ({
                nodes: {
                    ...state.nodes,
                    [track.startNodeId]: {
                        ...state.nodes[track.startNodeId],
                        connections: [],
                    },
                },
            }));

            expect(isValidConnectTarget(track.startNodeId)).toBe(false);
        });

        it('should return false for node with 2+ connections (junction)', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 224, y: 100 });

            // Connect them to create a junction
            useTrackStore.getState().connectNodes(track1.endNodeId, track2.startNodeId, track2.edgeId);

            const mergedNode = getTrackState().nodes[track1.endNodeId];
            expect(mergedNode.connections.length).toBe(2);

            expect(isValidConnectTarget(track1.endNodeId)).toBe(false);
        });

        it('should return true for node with exactly 1 connection (open endpoint)', () => {
            const track = placeTrack({ x: 100, y: 100 });
            expect(isValidConnectTarget(track.startNodeId)).toBe(true);
        });

        it('should return false if node matches connectSource.nodeId', () => {
            const track = placeTrack({ x: 100, y: 100 });

            useEditorStore.setState({
                connectSource: {
                    nodeId: track.startNodeId,
                    edgeId: track.edgeId,
                },
            });

            expect(isValidConnectTarget(track.startNodeId)).toBe(false);
        });

        it('should return false if node is on same part as source', () => {
            const track = placeTrack({ x: 100, y: 100 });

            useEditorStore.setState({
                connectSource: {
                    nodeId: track.startNodeId,
                    edgeId: track.edgeId,
                },
            });

            // End node is on same part
            expect(isValidConnectTarget(track.endNodeId)).toBe(false);
        });

        it('should return true for valid target on different part', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 500, y: 100 });

            useEditorStore.setState({
                connectSource: {
                    nodeId: track1.endNodeId,
                    edgeId: track1.edgeId,
                },
            });

            expect(isValidConnectTarget(track2.startNodeId)).toBe(true);
        });
    });

    // ===========================
    // First Click (Set Source) Tests
    // ===========================

    describe('handleFirstClick - Set Source', () => {
        it('should do nothing if editSubMode !== connect', () => {
            useModeStore.setState({ editSubMode: 'select' });
            const track = placeTrack({ x: 100, y: 100 });

            const result = handleFirstClick(track.startNodeId);

            expect(result).toBe(false);
            expect(getEditorState().connectSource).toBeNull();
        });

        it('should do nothing if node does not exist', () => {
            const result = handleFirstClick('non-existent-node' as NodeId);

            expect(result).toBe(false);
            expect(getEditorState().connectSource).toBeNull();
        });

        it('should do nothing if node has 0 connections', () => {
            const track = placeTrack({ x: 100, y: 100 });

            useTrackStore.setState((state) => ({
                nodes: {
                    ...state.nodes,
                    [track.startNodeId]: {
                        ...state.nodes[track.startNodeId],
                        connections: [],
                    },
                },
            }));

            const result = handleFirstClick(track.startNodeId);

            expect(result).toBe(false);
            expect(getEditorState().connectSource).toBeNull();
        });

        it('should do nothing if node has 2+ connections (junction)', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 224, y: 100 });
            useTrackStore.getState().connectNodes(track1.endNodeId, track2.startNodeId, track2.edgeId);

            const result = handleFirstClick(track1.endNodeId);

            expect(result).toBe(false);
            expect(getEditorState().connectSource).toBeNull();
        });

        it('should set connectSource for valid open endpoint', () => {
            const track = placeTrack({ x: 100, y: 100 });

            const result = handleFirstClick(track.startNodeId);

            expect(result).toBe(true);
            const source = getEditorState().connectSource;
            expect(source).not.toBeNull();
            expect(source!.nodeId).toBe(track.startNodeId);
        });

        it('should store both nodeId and edgeId in connectSource', () => {
            const track = placeTrack({ x: 100, y: 100 });

            handleFirstClick(track.startNodeId);

            const source = getEditorState().connectSource;
            expect(source).toEqual({
                nodeId: track.startNodeId,
                edgeId: track.edgeId,
            });
        });
    });

    // ===========================
    // Second Click (Connect) Tests
    // ===========================

    describe('handleSecondClick - Connect', () => {
        it('should return error if no source selected', () => {
            const track = placeTrack({ x: 100, y: 100 });

            const result = handleSecondClick(track.startNodeId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('No source selected');
        });

        it('should clear source if source node no longer exists', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 500, y: 100 });

            useEditorStore.setState({
                connectSource: {
                    nodeId: track1.endNodeId,
                    edgeId: track1.edgeId,
                },
            });

            // Remove the source track
            useTrackStore.getState().removeTrack(track1.edgeId);

            const result = handleSecondClick(track2.startNodeId);

            expect(result.success).toBe(false);
            expect(getEditorState().connectSource).toBeNull();
        });

        it('should reject if same part (validation fails)', () => {
            const track = placeTrack({ x: 100, y: 100 });

            useEditorStore.setState({
                connectSource: {
                    nodeId: track.startNodeId,
                    edgeId: track.edgeId,
                },
            });

            const result = handleSecondClick(track.endNodeId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cannot connect a part to itself');
            // Source should NOT be cleared on rejection
            expect(getEditorState().connectSource).not.toBeNull();
        });

        it('should connect and merge nodes on valid connection', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 224, y: 100 });

            useEditorStore.setState({
                connectSource: { nodeId: track1.endNodeId, edgeId: track1.edgeId },
            });

            const initialNodeCount = Object.keys(getTrackState().nodes).length;
            expect(initialNodeCount).toBe(4);

            const result = handleSecondClick(track2.startNodeId);

            expect(result.success).toBe(true);
            const finalNodeCount = Object.keys(getTrackState().nodes).length;
            expect(finalNodeCount).toBe(3); // One node merged
        });

        it('should clear connectSource after successful connection', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 224, y: 100 });

            useEditorStore.setState({
                connectSource: { nodeId: track1.endNodeId, edgeId: track1.edgeId },
            });

            handleSecondClick(track2.startNodeId);

            expect(getEditorState().connectSource).toBeNull();
        });

        it('should update edge references after connection', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 224, y: 100 });

            useEditorStore.setState({
                connectSource: { nodeId: track1.endNodeId, edgeId: track1.edgeId },
            });

            handleSecondClick(track2.startNodeId);

            // The merged node should have 2 connections
            const mergedNode = getTrackState().nodes[track1.endNodeId];
            expect(mergedNode.connections.length).toBe(2);
            expect(mergedNode.connections).toContain(track1.edgeId);
            expect(mergedNode.connections).toContain(track2.edgeId);
        });
    });

    // ===========================
    // cancelConnect Tests
    // ===========================

    describe('cancelConnect (clearConnectSource)', () => {
        it('should clear connectSource', () => {
            const track = placeTrack({ x: 100, y: 100 });

            useEditorStore.setState({
                connectSource: { nodeId: track.startNodeId, edgeId: track.edgeId },
            });

            useEditorStore.getState().clearConnectSource();

            expect(getEditorState().connectSource).toBeNull();
        });

        it('should not change editSubMode when clearing source', () => {
            const track = placeTrack({ x: 100, y: 100 });

            useEditorStore.setState({
                connectSource: { nodeId: track.startNodeId, edgeId: track.edgeId },
            });

            useEditorStore.getState().clearConnectSource();

            expect(getModeState().editSubMode).toBe('connect');
        });
    });

    // ===========================
    // exitConnectMode Tests
    // ===========================

    describe('exitConnectMode', () => {
        it('should clear connectSource when exiting', () => {
            const track = placeTrack({ x: 100, y: 100 });

            useEditorStore.setState({
                connectSource: { nodeId: track.startNodeId, edgeId: track.edgeId },
            });

            // Exit connect mode
            useEditorStore.getState().clearConnectSource();
            useModeStore.getState().setEditSubMode('select');

            expect(getEditorState().connectSource).toBeNull();
        });

        it('should set editSubMode to select when exiting', () => {
            // Exit connect mode
            useModeStore.getState().setEditSubMode('select');

            expect(getModeState().editSubMode).toBe('select');
        });
    });

    // ===========================
    // Integration Tests
    // ===========================

    describe('integration', () => {
        it('should complete full 2-click connection workflow', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 500, y: 100 });

            // Initial state
            expect(Object.keys(getTrackState().nodes).length).toBe(4);
            expect(Object.keys(getTrackState().edges).length).toBe(2);
            expect(getEditorState().connectSource).toBeNull();

            // First click: select source
            const firstResult = handleFirstClick(track1.endNodeId);
            expect(firstResult).toBe(true);
            expect(getEditorState().connectSource).toEqual({
                nodeId: track1.endNodeId,
                edgeId: track1.edgeId,
            });

            // Second click: connect
            const secondResult = handleSecondClick(track2.startNodeId);
            expect(secondResult.success).toBe(true);

            // After connection
            expect(Object.keys(getTrackState().nodes).length).toBe(3);
            expect(Object.keys(getTrackState().edges).length).toBe(2);
            expect(getEditorState().connectSource).toBeNull();
        });

        it('should handle multiple sequential connections', () => {
            // Place tracks at adjacent positions (124mm apart for straight tracks)
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 324, y: 100 }); // 100 + 124 + 100 gap
            const track3 = placeTrack({ x: 548, y: 100 }); // 324 + 124 + 100 gap

            // Initial: 6 nodes, 3 edges
            expect(Object.keys(getTrackState().nodes).length).toBe(6);

            // Connect track1 to track2
            handleFirstClick(track1.endNodeId);
            const result1 = handleSecondClick(track2.startNodeId);
            expect(result1.success).toBe(true);

            // After first connection: 5 nodes
            expect(Object.keys(getTrackState().nodes).length).toBe(5);

            // Connect track2 to track3 - track2.endNodeId is still valid
            handleFirstClick(track2.endNodeId);
            const result2 = handleSecondClick(track3.startNodeId);
            expect(result2.success).toBe(true);

            expect(Object.keys(getTrackState().nodes).length).toBe(4);
        });

        it('should handle cancel and restart workflow', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 324, y: 100 }); // Adjacent position

            // Start selection
            handleFirstClick(track1.endNodeId);
            expect(getEditorState().connectSource).not.toBeNull();

            // Cancel
            useEditorStore.getState().clearConnectSource();
            expect(getEditorState().connectSource).toBeNull();

            // Restart with different source
            handleFirstClick(track2.startNodeId);
            expect(getEditorState().connectSource?.nodeId).toBe(track2.startNodeId);

            // Complete connection to track1's end node
            const result = handleSecondClick(track1.endNodeId);
            expect(result.success).toBe(true);
            expect(Object.keys(getTrackState().nodes).length).toBe(3);
        });

        it('should reject attempt to create a cycle', () => {
            // Create a line of 3 tracks connected end-to-end at adjacent positions
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 324, y: 100 });
            const track3 = placeTrack({ x: 548, y: 100 });

            // Connect them linearly: track1 -> track2 -> track3
            handleFirstClick(track1.endNodeId);
            const r1 = handleSecondClick(track2.startNodeId);
            expect(r1.success).toBe(true);

            handleFirstClick(track2.endNodeId);
            const r2 = handleSecondClick(track3.startNodeId);
            expect(r2.success).toBe(true);

            // Now we have: track1.start, junction1, junction2, track3.end = 4 nodes
            expect(Object.keys(getTrackState().nodes).length).toBe(4);

            // Try to connect track1.start to track3.end (would create cycle)
            handleFirstClick(track1.startNodeId);
            const cycleResult = handleSecondClick(track3.endNodeId);

            expect(cycleResult.success).toBe(false);
            expect(cycleResult.error).toBe('Parts are already connected (would create cycle)');
        });
    });

    // ===========================
    // validateConnection Utility Tests
    // ===========================

    describe('validateConnection', () => {
        it('should reject if source is not an open endpoint', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 224, y: 100 });
            const track3 = placeTrack({ x: 500, y: 100 });

            // Create junction at track1.end
            useTrackStore.getState().connectNodes(track1.endNodeId, track2.startNodeId, track2.edgeId);

            const junctionNode = getTrackState().nodes[track1.endNodeId];
            const targetNode = getTrackState().nodes[track3.startNodeId];

            const result = validateConnection(junctionNode, targetNode, getTrackState().edges, getTrackState().nodes);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Source node is not an open endpoint');
        });

        it('should reject if target is not an open endpoint', () => {
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 224, y: 100 });
            const track3 = placeTrack({ x: 500, y: 100 });

            // Create junction at track2.end
            useTrackStore.getState().connectNodes(track2.endNodeId, track3.startNodeId, track3.edgeId);

            const sourceNode = getTrackState().nodes[track1.startNodeId];
            const junctionNode = getTrackState().nodes[track2.endNodeId];

            const result = validateConnection(sourceNode, junctionNode, getTrackState().edges, getTrackState().nodes);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Target node is not an open endpoint');
        });

        it('should accept valid connection between different parts', () => {
            // Place tracks at positions where they could be connected
            const track1 = placeTrack({ x: 100, y: 100 });
            const track2 = placeTrack({ x: 324, y: 100 });

            const sourceNode = getTrackState().nodes[track1.endNodeId];
            const targetNode = getTrackState().nodes[track2.startNodeId];

            // Verify both are open endpoints
            expect(sourceNode.connections.length).toBe(1);
            expect(targetNode.connections.length).toBe(1);

            const result = validateConnection(sourceNode, targetNode, getTrackState().edges, getTrackState().nodes);

            expect(result.isValid).toBe(true);
        });
    });
});
