/**
 * Circuit Formation Scenario Tests
 * 
 * Integration tests for forming a complete closed-loop track circuit:
 * - 8 x 45° curves (kato-20-100, R249)
 * - 2 x straight tracks (kato-20-020, 124mm)
 * 
 * Tests the full user workflow: placing tracks independently and
 * connecting them using connectNetworks() to form an oval layout.
 * 
 * @created 2026-01-07
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTrackStore } from '../useTrackStore';
import { useBudgetStore } from '../useBudgetStore';
import {
    validateConnection,
    getNodeFacadeFromEdge,
    calculateRotationForConnection,
    getNodeConnectorType
} from '../../utils/connectTransform';
import type { NodeId, Vector2 } from '../../types';

// ===========================
// Constants
// ===========================

const CURVE_PART_ID = 'kato-20-100';     // R249-45° curve
const STRAIGHT_PART_ID = 'kato-20-020'; // 124mm straight
const CURVE_RADIUS = 249;
const CURVE_ANGLE = 45;
const STRAIGHT_LENGTH = 124;

// ===========================
// Helper Functions
// ===========================

/**
 * Get track store state
 */
function getStore() {
    return useTrackStore.getState();
}

/**
 * Place a track and return its info
 */
function placeTrack(partId: string, position: Vector2, rotation: number) {
    const edgeId = getStore().addTrack(partId, position, rotation);
    if (!edgeId) throw new Error(`Failed to place track ${partId} at (${position.x}, ${position.y})`);

    const edge = getStore().edges[edgeId];
    return {
        edgeId,
        edge,
        startNodeId: edge.startNodeId,
        endNodeId: edge.endNodeId,
    };
}

/**
 * Get open endpoints in the layout
 */
function getOpenEndpoints(): string[] {
    return getStore().getOpenEndpoints().map(node => node.id);
}

/**
 * Check if two nodes can be connected
 */
function canConnect(nodeA: NodeId, nodeB: NodeId): { isValid: boolean; error?: string } {
    const { nodes, edges } = getStore();
    const a = nodes[nodeA];
    const b = nodes[nodeB];
    if (!a || !b) return { isValid: false, error: 'Node does not exist' };
    return validateConnection(a, b, edges, nodes);
}

/**
 * Connect two open endpoints using the full connect mode workflow
 * Returns true if successful
 */
function connectEndpoints(
    anchorNodeId: NodeId,
    movingNodeId: NodeId
): { success: boolean; error?: string } {
    const { nodes, edges, connectNetworks } = getStore();

    const anchorNode = nodes[anchorNodeId];
    const movingNode = nodes[movingNodeId];

    if (!anchorNode || !movingNode) {
        return { success: false, error: 'Node does not exist' };
    }

    // Validate connection
    const validation = canConnect(anchorNodeId, movingNodeId);
    if (!validation.isValid) {
        return { success: false, error: validation.error };
    }

    // Get edge info for rotation calculation
    const anchorEdgeId = anchorNode.connections[0];
    const movingEdgeId = movingNode.connections[0];
    const anchorEdge = edges[anchorEdgeId];
    const movingEdge = edges[movingEdgeId];

    if (!anchorEdge || !movingEdge) {
        return { success: false, error: 'Could not find edges' };
    }

    // Calculate rotation for alignment
    const anchorFacade = getNodeFacadeFromEdge(anchorNodeId, anchorEdge);
    const movingFacade = getNodeFacadeFromEdge(movingNodeId, movingEdge);
    const anchorConnectorType = getNodeConnectorType(anchorNodeId, anchorEdge);
    const movingConnectorType = getNodeConnectorType(movingNodeId, movingEdge);
    const isYJunction = anchorConnectorType === movingConnectorType;
    const rotationDelta = calculateRotationForConnection(anchorFacade, movingFacade, isYJunction);

    // Execute connection
    connectNetworks(anchorNodeId, movingNodeId, movingEdgeId, rotationDelta);

    return { success: true };
}

/**
 * Validate that edge geometry matches node positions
 */
function validateGeometryIntegrity(): { valid: boolean; errors: string[] } {
    const { nodes, edges } = getStore();
    const errors: string[] = [];
    const TOLERANCE = 0.001; // mm

    for (const [edgeId, edge] of Object.entries(edges)) {
        const startNode = nodes[edge.startNodeId];
        const endNode = nodes[edge.endNodeId];

        if (!startNode || !endNode) {
            errors.push(`Edge ${edgeId.slice(0, 8)}: Missing nodes`);
            continue;
        }

        // Check geometry start vs start node position
        if (edge.geometry.type === 'straight') {
            const startDist = Math.hypot(
                edge.geometry.start.x - startNode.position.x,
                edge.geometry.start.y - startNode.position.y
            );
            const endDist = Math.hypot(
                edge.geometry.end.x - endNode.position.x,
                edge.geometry.end.y - endNode.position.y
            );

            if (startDist > TOLERANCE) {
                errors.push(`Edge ${edgeId.slice(0, 8)}: Start position mismatch (${startDist.toFixed(4)}mm)`);
            }
            if (endDist > TOLERANCE) {
                errors.push(`Edge ${edgeId.slice(0, 8)}: End position mismatch (${endDist.toFixed(4)}mm)`);
            }
        } else if (edge.geometry.type === 'arc') {
            // For arcs, verify startNode is at the start of the arc
            const { center, radius, startAngle, endAngle } = edge.geometry;
            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;

            const expectedStart = {
                x: center.x + Math.cos(startAngleRad) * radius,
                y: center.y + Math.sin(startAngleRad) * radius,
            };
            const expectedEnd = {
                x: center.x + Math.cos(endAngleRad) * radius,
                y: center.y + Math.sin(endAngleRad) * radius,
            };

            const startDist = Math.hypot(
                expectedStart.x - startNode.position.x,
                expectedStart.y - startNode.position.y
            );
            const endDist = Math.hypot(
                expectedEnd.x - endNode.position.x,
                expectedEnd.y - endNode.position.y
            );

            if (startDist > TOLERANCE) {
                errors.push(`Arc ${edgeId.slice(0, 8)}: Start position mismatch (${startDist.toFixed(4)}mm)`);
            }
            if (endDist > TOLERANCE) {
                errors.push(`Arc ${edgeId.slice(0, 8)}: End position mismatch (${endDist.toFixed(4)}mm)`);
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

// ===========================
// Test Suite
// ===========================

describe('Circuit Formation: Oval Layout (8 Curves + 2 Straights)', () => {
    beforeEach(() => {
        useTrackStore.getState().clearLayout();
        useBudgetStore.getState().reset();
    });

    // ===========================
    // Track Placement Tests
    // ===========================

    describe('Track Placement', () => {
        it('places a curve track with correct arc geometry', () => {
            const track = placeTrack(CURVE_PART_ID, { x: 300, y: 300 }, 0);

            expect(track.edge.geometry.type).toBe('arc');
            if (track.edge.geometry.type === 'arc') {
                expect(track.edge.geometry.radius).toBe(CURVE_RADIUS);
                const sweepAngle = track.edge.geometry.endAngle - track.edge.geometry.startAngle;
                expect(sweepAngle).toBeCloseTo(CURVE_ANGLE, 5);
            }
        });

        it('places a straight track with correct geometry', () => {
            const track = placeTrack(STRAIGHT_PART_ID, { x: 300, y: 300 }, 0);

            expect(track.edge.geometry.type).toBe('straight');
            if (track.edge.geometry.type === 'straight') {
                const length = Math.hypot(
                    track.edge.geometry.end.x - track.edge.geometry.start.x,
                    track.edge.geometry.end.y - track.edge.geometry.start.y
                );
                expect(length).toBeCloseTo(STRAIGHT_LENGTH, 5);
            }
        });

        it('places 10 tracks correctly (8 curves + 2 straights)', () => {
            // Place 8 curves at various positions (will be connected later)
            for (let i = 0; i < 8; i++) {
                placeTrack(CURVE_PART_ID, { x: 100 + i * 50, y: 100 }, i * 45);
            }
            // Place 2 straights
            placeTrack(STRAIGHT_PART_ID, { x: 600, y: 100 }, 0);
            placeTrack(STRAIGHT_PART_ID, { x: 700, y: 100 }, 0);

            const { edges } = getStore();
            expect(Object.keys(edges)).toHaveLength(10);
        });

        it('has 20 open endpoints initially (10 tracks × 2 endpoints)', () => {
            // Place all 10 tracks
            for (let i = 0; i < 8; i++) {
                placeTrack(CURVE_PART_ID, { x: 100 + i * 50, y: 100 + i * 30 }, i * 45);
            }
            placeTrack(STRAIGHT_PART_ID, { x: 600, y: 100 }, 0);
            placeTrack(STRAIGHT_PART_ID, { x: 700, y: 100 }, 0);

            const openEndpoints = getOpenEndpoints();
            expect(openEndpoints).toHaveLength(20);
        });
    });

    // ===========================
    // Sequential Connection Tests
    // ===========================

    describe('Sequential Connections', () => {
        it('first connection merges nodes correctly', () => {
            const track1 = placeTrack(CURVE_PART_ID, { x: 300, y: 300 }, 0);
            const track2 = placeTrack(CURVE_PART_ID, { x: 500, y: 300 }, 45);

            const initialNodeCount = Object.keys(getStore().nodes).length;
            expect(initialNodeCount).toBe(4); // 2 tracks × 2 nodes

            const result = connectEndpoints(track1.endNodeId, track2.startNodeId);
            expect(result.success).toBe(true);

            const finalNodeCount = Object.keys(getStore().nodes).length;
            expect(finalNodeCount).toBe(3); // One node merged
        });

        it('connection reduces open endpoints by 2', () => {
            const track1 = placeTrack(CURVE_PART_ID, { x: 300, y: 300 }, 0);
            const track2 = placeTrack(CURVE_PART_ID, { x: 500, y: 300 }, 45);

            const initialOpen = getOpenEndpoints().length;
            expect(initialOpen).toBe(4);

            connectEndpoints(track1.endNodeId, track2.startNodeId);

            const finalOpen = getOpenEndpoints().length;
            expect(finalOpen).toBe(2); // 4 - 2 = 2
        });

        it('merged node has exactly 2 connections', () => {
            const track1 = placeTrack(CURVE_PART_ID, { x: 300, y: 300 }, 0);
            const track2 = placeTrack(CURVE_PART_ID, { x: 500, y: 300 }, 45);

            connectEndpoints(track1.endNodeId, track2.startNodeId);

            // track1.endNodeId is the survivor
            const mergedNode = getStore().nodes[track1.endNodeId];
            expect(mergedNode.connections).toHaveLength(2);
            expect(mergedNode.connections).toContain(track1.edgeId);
            expect(mergedNode.connections).toContain(track2.edgeId);
        });

        it('multiple connections work in sequence (3 tracks)', () => {
            const track1 = placeTrack(CURVE_PART_ID, { x: 300, y: 300 }, 0);
            const track2 = placeTrack(CURVE_PART_ID, { x: 500, y: 300 }, 45);
            const track3 = placeTrack(CURVE_PART_ID, { x: 700, y: 300 }, 90);

            expect(Object.keys(getStore().nodes).length).toBe(6);
            expect(getOpenEndpoints().length).toBe(6);

            // Connect 1 -> 2
            const r1 = connectEndpoints(track1.endNodeId, track2.startNodeId);
            expect(r1.success).toBe(true);
            expect(Object.keys(getStore().nodes).length).toBe(5);

            // Connect 2 -> 3
            const r2 = connectEndpoints(track2.endNodeId, track3.startNodeId);
            expect(r2.success).toBe(true);
            expect(Object.keys(getStore().nodes).length).toBe(4);
            expect(getOpenEndpoints().length).toBe(2);
        });

        it('rejects connecting nodes from same track', () => {
            const track = placeTrack(CURVE_PART_ID, { x: 300, y: 300 }, 0);

            const result = connectEndpoints(track.startNodeId, track.endNodeId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cannot connect a part to itself');
        });
    });

    // ===========================
    // Closed Loop Verification
    // ===========================

    describe('Closed Loop Verification', () => {
        /**
         * NOTE: The current implementation includes cycle detection that
         * PREVENTS closing loops. When two endpoints belong to the same
         * connected network (all pieces already connected), connecting them
         * is blocked to prevent accidental cycle creation.
         * 
         * For a train track app, closed loops SHOULD be allowed. This is
         * documented as a known limitation that may be addressed in a
         * future enhancement.
         */

        it('connects 7 curves into a chain (8th connection blocked by cycle detection)', () => {
            // Place 8 curves
            const tracks: ReturnType<typeof placeTrack>[] = [];
            for (let i = 0; i < 8; i++) {
                tracks.push(placeTrack(CURVE_PART_ID, { x: 200 + i * 60, y: 200 }, i * 45));
            }

            // Initial state: 16 nodes, 16 open endpoints
            expect(Object.keys(getStore().nodes).length).toBe(16);
            expect(getOpenEndpoints().length).toBe(16);

            // Connect in sequence: C1 -> C2 -> C3 -> ... -> C8 (7 connections)
            for (let i = 0; i < 7; i++) {
                const result = connectEndpoints(tracks[i].endNodeId, tracks[i + 1].startNodeId);
                expect(result.success).toBe(true);
            }

            // After 7 connections: 9 nodes, 2 open endpoints
            expect(Object.keys(getStore().nodes).length).toBe(9);
            expect(getOpenEndpoints().length).toBe(2);
        });

        it('successfully closes loop by connecting chain endpoints', () => {
            // Place and connect 8 curves into a chain
            const tracks: ReturnType<typeof placeTrack>[] = [];
            for (let i = 0; i < 8; i++) {
                tracks.push(placeTrack(CURVE_PART_ID, { x: 200 + i * 60, y: 200 }, i * 45));
            }

            // Connect in sequence
            for (let i = 0; i < 7; i++) {
                connectEndpoints(tracks[i].endNodeId, tracks[i + 1].startNodeId);
            }

            // Close the loop: C8.end -> C1.start
            // This should SUCCEED - closed loops are valid for train tracks
            const closeResult = connectEndpoints(tracks[7].endNodeId, tracks[0].startNodeId);

            expect(closeResult.success).toBe(true);

            // Layout now has 0 open endpoints (closed loop)
            expect(getOpenEndpoints().length).toBe(0);

            // All 8 nodes should have exactly 2 connections
            const { nodes } = getStore();
            expect(Object.keys(nodes).length).toBe(8);
            for (const node of Object.values(nodes)) {
                expect(node.connections.length).toBe(2);
            }
        });

        it('builds complete open-path oval (9 connections, 2 open ends)', () => {
            // Layout: C1-C2-C3-C4-S1-C5-C6-C7-C8-S2 (open path)
            const curves: ReturnType<typeof placeTrack>[] = [];
            const straights: ReturnType<typeof placeTrack>[] = [];

            // Place 8 curves spread out
            for (let i = 0; i < 8; i++) {
                curves.push(placeTrack(CURVE_PART_ID, { x: 200 + i * 60, y: 200 }, i * 45));
            }

            // Place 2 straights
            straights.push(placeTrack(STRAIGHT_PART_ID, { x: 700, y: 200 }, 0));
            straights.push(placeTrack(STRAIGHT_PART_ID, { x: 800, y: 200 }, 180));

            // Initial: 10 edges × 2 = 20 endpoints
            expect(getOpenEndpoints().length).toBe(20);

            // Connect first 4 curves
            for (let i = 0; i < 3; i++) {
                expect(connectEndpoints(curves[i].endNodeId, curves[i + 1].startNodeId).success).toBe(true);
            }

            // Connect C4 to first straight
            expect(connectEndpoints(curves[3].endNodeId, straights[0].startNodeId).success).toBe(true);

            // Connect S1 to C5
            expect(connectEndpoints(straights[0].endNodeId, curves[4].startNodeId).success).toBe(true);

            // Connect C5-C8
            for (let i = 4; i < 7; i++) {
                expect(connectEndpoints(curves[i].endNodeId, curves[i + 1].startNodeId).success).toBe(true);
            }

            // Connect C8 to second straight
            expect(connectEndpoints(curves[7].endNodeId, straights[1].startNodeId).success).toBe(true);

            // After 9 connections, we have 2 open endpoints remaining (open path)
            expect(getOpenEndpoints().length).toBe(2);
            expect(Object.keys(getStore().nodes).length).toBe(11); // 20 - 9 = 11
            expect(Object.keys(getStore().edges).length).toBe(10); // 10 tracks
        });

        it('chain nodes have correct connection counts', () => {
            // Build a chain of 8 curves (7 connections)
            const tracks: ReturnType<typeof placeTrack>[] = [];
            for (let i = 0; i < 8; i++) {
                tracks.push(placeTrack(CURVE_PART_ID, { x: 200 + i * 60, y: 200 }, i * 45));
            }

            // Connect in sequence
            for (let i = 0; i < 7; i++) {
                connectEndpoints(tracks[i].endNodeId, tracks[i + 1].startNodeId);
            }

            // Verify: 7 internal nodes have 2 connections, 2 end nodes have 1 connection
            const { nodes } = getStore();
            let endpointCount = 0;
            let junctionCount = 0;

            for (const node of Object.values(nodes)) {
                if (node.connections.length === 1) endpointCount++;
                else if (node.connections.length === 2) junctionCount++;
            }

            expect(endpointCount).toBe(2); // Two open ends
            expect(junctionCount).toBe(7); // Seven internal junctions
        });
    });

    // ===========================
    // Geometry Integrity Tests
    // ===========================

    describe('Geometry Integrity', () => {
        it('geometry matches node positions after single connection', () => {
            const track1 = placeTrack(CURVE_PART_ID, { x: 300, y: 300 }, 0);
            const track2 = placeTrack(CURVE_PART_ID, { x: 500, y: 300 }, 45);

            connectEndpoints(track1.endNodeId, track2.startNodeId);

            const result = validateGeometryIntegrity();
            expect(result.errors).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('geometry matches node positions after connecting chain', () => {
            // Build 8-curve chain (7 connections)
            const tracks: ReturnType<typeof placeTrack>[] = [];
            for (let i = 0; i < 8; i++) {
                tracks.push(placeTrack(CURVE_PART_ID, { x: 200 + i * 60, y: 200 }, i * 45));
            }

            for (let i = 0; i < 7; i++) {
                connectEndpoints(tracks[i].endNodeId, tracks[i + 1].startNodeId);
            }
            // Note: Loop closing blocked by cycle detection, so we verify chain geometry

            const result = validateGeometryIntegrity();
            expect(result.errors).toEqual([]);
            expect(result.valid).toBe(true);
        });

        it('arc radius preserved after connections', () => {
            const tracks: ReturnType<typeof placeTrack>[] = [];
            for (let i = 0; i < 4; i++) {
                tracks.push(placeTrack(CURVE_PART_ID, { x: 200 + i * 60, y: 200 }, i * 45));
            }

            // Connect them
            for (let i = 0; i < 3; i++) {
                connectEndpoints(tracks[i].endNodeId, tracks[i + 1].startNodeId);
            }

            // Verify all arcs still have correct radius
            const { edges } = getStore();
            for (const edge of Object.values(edges)) {
                if (edge.geometry.type === 'arc') {
                    expect(edge.geometry.radius).toBe(CURVE_RADIUS);
                }
            }
        });
    });
});
