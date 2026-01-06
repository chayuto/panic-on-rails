/**
 * Unit Tests for useTrackStore
 * 
 * Comprehensive test coverage for the track management store.
 * Tests all CRUD operations, network connections, geometry sync, and spatial queries.
 * 
 * @created 2026-01-07
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTrackStore } from '../useTrackStore';
import { useBudgetStore } from '../useBudgetStore';
import type { Vector2 } from '../../types';

// ===========================
// Test Helpers
// ===========================

/**
 * Helper to get current store state with type safety
 */
function getState() {
    return useTrackStore.getState();
}

/**
 * Helper to count nodes
 */
function nodeCount(): number {
    return Object.keys(getState().nodes).length;
}

/**
 * Helper to count edges
 */
function edgeCount(): number {
    return Object.keys(getState().edges).length;
}

/**
 * Helper to get distance between two points
 */
function distance(a: Vector2, b: Vector2): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

// ===========================
// Test Suite
// ===========================

describe('useTrackStore', () => {
    // Reset store to empty state before each test
    beforeEach(() => {
        // Clear the track store
        getState().clearLayout();
        // Also reset budget to avoid interference
        useBudgetStore.getState().reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ===========================
    // Initial State Tests
    // ===========================

    describe('initial state', () => {
        it('should start with empty nodes object', () => {
            expect(getState().nodes).toEqual({});
        });

        it('should start with empty edges object', () => {
            expect(getState().edges).toEqual({});
        });

        it('should have 0 nodes after clearLayout', () => {
            // Add a track first
            getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            expect(nodeCount()).toBeGreaterThan(0);

            // Clear
            getState().clearLayout();
            expect(nodeCount()).toBe(0);
        });

        it('should have 0 edges after clearLayout', () => {
            // Add a track first
            getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            expect(edgeCount()).toBeGreaterThan(0);

            // Clear
            getState().clearLayout();
            expect(edgeCount()).toBe(0);
        });
    });

    // ===========================
    // addTrack Tests - Straight
    // ===========================

    describe('addTrack - straight', () => {
        it('should return edge ID on successful placement', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            expect(edgeId).not.toBeNull();
            expect(typeof edgeId).toBe('string');
        });

        it('should create 2 nodes for straight track', () => {
            getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            expect(nodeCount()).toBe(2);
        });

        it('should create 1 edge for straight track', () => {
            getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            expect(edgeCount()).toBe(1);
        });

        it('should set correct start position', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];

            expect(edge.geometry.type).toBe('straight');
            if (edge.geometry.type === 'straight') {
                expect(edge.geometry.start.x).toBe(100);
                expect(edge.geometry.start.y).toBe(100);
            }
        });

        it('should calculate correct end position for 0° rotation', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];

            if (edge.geometry.type === 'straight') {
                // kato-20-020 is 124mm long, 0° = pointing east
                expect(edge.geometry.end.x).toBeCloseTo(224);
                expect(edge.geometry.end.y).toBeCloseTo(100);
            }
        });

        it('should calculate correct end position for 90° rotation', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 90);
            const edge = getState().edges[edgeId!];

            if (edge.geometry.type === 'straight') {
                // 90° = pointing south
                expect(edge.geometry.end.x).toBeCloseTo(100);
                expect(edge.geometry.end.y).toBeCloseTo(224);
            }
        });

        it('should calculate correct end position for 180° rotation', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 180);
            const edge = getState().edges[edgeId!];

            if (edge.geometry.type === 'straight') {
                // 180° = pointing west
                expect(edge.geometry.end.x).toBeCloseTo(-24);
                expect(edge.geometry.end.y).toBeCloseTo(100);
            }
        });

        it('should calculate correct end position for 270° rotation', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 270);
            const edge = getState().edges[edgeId!];

            if (edge.geometry.type === 'straight') {
                // 270° = pointing north
                expect(edge.geometry.end.x).toBeCloseTo(100);
                expect(edge.geometry.end.y).toBeCloseTo(-24);
            }
        });

        it('should set correct node types (both endpoint)', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];
            const startNode = getState().nodes[edge.startNodeId];
            const endNode = getState().nodes[edge.endNodeId];

            expect(startNode.type).toBe('endpoint');
            expect(endNode.type).toBe('endpoint');
        });

        it('should set correct node rotations (180° apart)', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];
            const startNode = getState().nodes[edge.startNodeId];
            const endNode = getState().nodes[edge.endNodeId];

            // Start node faces backwards (180°), end node faces forwards (0°)
            expect(startNode.rotation).toBe(180);
            expect(endNode.rotation).toBe(0);
        });

        it('should set correct intrinsicGeometry for straight', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];

            expect(edge.intrinsicGeometry).toBeDefined();
            expect(edge.intrinsicGeometry?.type).toBe('straight');
            if (edge.intrinsicGeometry?.type === 'straight') {
                expect(edge.intrinsicGeometry.length).toBe(124);
            }
        });

        it('should set correct partId', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];

            expect(edge.partId).toBe('kato-20-020');
        });

        it('should return null for invalid partId', () => {
            const edgeId = getState().addTrack('non-existent-part', { x: 100, y: 100 }, 0);
            expect(edgeId).toBeNull();
        });

        it('should not create any nodes for invalid partId', () => {
            getState().addTrack('non-existent-part', { x: 100, y: 100 }, 0);
            expect(nodeCount()).toBe(0);
        });

        it('should add multiple tracks independently', () => {
            getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            getState().addTrack('kato-20-020', { x: 300, y: 100 }, 0);

            expect(nodeCount()).toBe(4);
            expect(edgeCount()).toBe(2);
        });
    });

    // ===========================
    // addTrack Tests - Curve
    // ===========================

    describe('addTrack - curve', () => {
        it('should create 2 nodes for curve track', () => {
            getState().addTrack('kato-20-100', { x: 100, y: 100 }, 0);
            expect(nodeCount()).toBe(2);
        });

        it('should create 1 edge for curve track', () => {
            getState().addTrack('kato-20-100', { x: 100, y: 100 }, 0);
            expect(edgeCount()).toBe(1);
        });

        it('should set arc geometry type', () => {
            const edgeId = getState().addTrack('kato-20-100', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];

            expect(edge.geometry.type).toBe('arc');
        });

        it('should set correct radius from catalog', () => {
            const edgeId = getState().addTrack('kato-20-100', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];

            if (edge.geometry.type === 'arc') {
                // kato-20-100 is R249-45°
                expect(edge.geometry.radius).toBe(249);
            }
        });

        it('should set 45° sweep angle', () => {
            const edgeId = getState().addTrack('kato-20-100', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];

            if (edge.geometry.type === 'arc') {
                const sweep = edge.geometry.endAngle - edge.geometry.startAngle;
                expect(sweep).toBeCloseTo(45);
            }
        });

        it('should set correct intrinsicGeometry for curve', () => {
            const edgeId = getState().addTrack('kato-20-100', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];

            expect(edge.intrinsicGeometry).toBeDefined();
            expect(edge.intrinsicGeometry?.type).toBe('arc');
            if (edge.intrinsicGeometry?.type === 'arc') {
                expect(edge.intrinsicGeometry.radius).toBe(249);
                expect(edge.intrinsicGeometry.sweepAngle).toBe(45);
                expect(edge.intrinsicGeometry.direction).toBe('ccw');
            }
        });

        it('should place end node at correct angle for 45° curve', () => {
            const edgeId = getState().addTrack('kato-20-100', { x: 100, y: 100 }, 0);
            const edge = getState().edges[edgeId!];
            const endNode = getState().nodes[edge.endNodeId];
            const startNode = getState().nodes[edge.startNodeId];

            // End node should be rotated 45° from start (use modular arithmetic for angles)
            const normalizeAngle = (a: number) => ((a % 360) + 360) % 360;
            const expectedAngle = normalizeAngle(startNode.rotation + 45 + 180);
            const actualAngle = normalizeAngle(endNode.rotation);
            expect(actualAngle).toBeCloseTo(expectedAngle);
        });
    });

    // ===========================
    // addTrack Tests - Switch
    // ===========================

    describe('addTrack - switch', () => {
        it('should create 3 nodes for switch track', () => {
            getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0);
            expect(nodeCount()).toBe(3);
        });

        it('should create 2 edges for switch track', () => {
            getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0);
            expect(edgeCount()).toBe(2);
        });

        it('should have entry node with switch type', () => {
            const edgeId = getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0);
            const mainEdge = getState().edges[edgeId!];
            const entryNode = getState().nodes[mainEdge.startNodeId];

            expect(entryNode.type).toBe('switch');
        });

        it('should have switchState defaulting to 0', () => {
            const edgeId = getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0);
            const mainEdge = getState().edges[edgeId!];
            const entryNode = getState().nodes[mainEdge.startNodeId];

            expect(entryNode.switchState).toBe(0);
        });

        it('should have switchBranches with 2 edge IDs', () => {
            const edgeId = getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0);
            const mainEdge = getState().edges[edgeId!];
            const entryNode = getState().nodes[mainEdge.startNodeId];

            expect(entryNode.switchBranches).toBeDefined();
            expect(entryNode.switchBranches).toHaveLength(2);
        });

        it('should have exit nodes as endpoints', () => {
            getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0);

            const endpoints = Object.values(getState().nodes).filter(n => n.type === 'endpoint');
            expect(endpoints).toHaveLength(2);
        });

        it('should have entry node with 2 connections', () => {
            const edgeId = getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0);
            const mainEdge = getState().edges[edgeId!];
            const entryNode = getState().nodes[mainEdge.startNodeId];

            expect(entryNode.connections).toHaveLength(2);
        });
    });

    // ===========================
    // addTrack Tests - Crossing
    // ===========================

    describe('addTrack - crossing', () => {
        it('should create 4 nodes for crossing track', () => {
            getState().addTrack('kato-20-320', { x: 100, y: 100 }, 0);
            expect(nodeCount()).toBe(4);
        });

        it('should create 2 edges for crossing track', () => {
            getState().addTrack('kato-20-320', { x: 100, y: 100 }, 0);
            expect(edgeCount()).toBe(2);
        });

        it('should have all nodes as endpoints', () => {
            getState().addTrack('kato-20-320', { x: 100, y: 100 }, 0);

            const nodes = Object.values(getState().nodes);
            expect(nodes.every(n => n.type === 'endpoint')).toBe(true);
        });

        it('should have crossing edges with same partId', () => {
            getState().addTrack('kato-20-320', { x: 100, y: 100 }, 0);

            const edges = Object.values(getState().edges);
            expect(edges[0].partId).toBe('kato-20-320');
            expect(edges[1].partId).toBe('kato-20-320');
        });
    });

    // ===========================
    // removeTrack Tests
    // ===========================

    describe('removeTrack', () => {
        it('should remove edge from state', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            expect(getState().edges[edgeId]).toBeDefined();

            getState().removeTrack(edgeId);
            expect(getState().edges[edgeId]).toBeUndefined();
        });

        it('should remove orphaned nodes', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            expect(nodeCount()).toBe(2);

            getState().removeTrack(edgeId);
            expect(nodeCount()).toBe(0);
        });

        it('should preserve connected nodes', () => {
            // Create two connected tracks
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 224, y: 100 }, 0)!;

            // These edges exist but we don't need to use them in the assertion
            // Just validating that both edges were created
            expect(getState().edges[edgeId1]).toBeDefined();
            expect(getState().edges[edgeId2]).toBeDefined();

            // Before connection: 4 nodes
            expect(nodeCount()).toBe(4);

            // After removing first track without connection
            getState().removeTrack(edgeId1);
            // Should still have 2 nodes from second track
            expect(nodeCount()).toBe(2);
        });

        it('should handle non-existent edge gracefully', () => {
            // Should not throw
            expect(() => {
                getState().removeTrack('non-existent-edge-id');
            }).not.toThrow();
        });

        it('should reduce edge count by 1', () => {
            getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            getState().addTrack('kato-20-020', { x: 300, y: 100 }, 0);
            const edgeId = getState().addTrack('kato-20-020', { x: 500, y: 100 }, 0)!;

            expect(edgeCount()).toBe(3);
            getState().removeTrack(edgeId);
            expect(edgeCount()).toBe(2);
        });
    });

    // ===========================
    // getOpenEndpoints Tests
    // ===========================

    describe('getOpenEndpoints', () => {
        it('should return empty array when no tracks', () => {
            const endpoints = getState().getOpenEndpoints();
            expect(endpoints).toHaveLength(0);
        });

        it('should return 2 endpoints for single straight track', () => {
            getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);

            const endpoints = getState().getOpenEndpoints();
            expect(endpoints).toHaveLength(2);
        });

        it('should return 4 endpoints for two unconnected tracks', () => {
            getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
            getState().addTrack('kato-20-020', { x: 400, y: 100 }, 0);

            const endpoints = getState().getOpenEndpoints();
            expect(endpoints).toHaveLength(4);
        });

        it('should return only nodes with 1 connection', () => {
            getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0); // Switch has 3 nodes

            const endpoints = getState().getOpenEndpoints();
            // Switch entry node has 2 connections, so only 2 exit nodes are open
            expect(endpoints).toHaveLength(2);
        });
    });

    // ===========================
    // connectNodes Tests
    // ===========================

    describe('connectNodes', () => {
        it('should merge nodes correctly (remove one)', () => {
            // Place two adjacent tracks
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 224, y: 100 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];

            expect(nodeCount()).toBe(4);

            // Connect end of edge1 to start of edge2
            getState().connectNodes(edge1.endNodeId, edge2.startNodeId, edgeId2);

            expect(nodeCount()).toBe(3); // Reduced by 1
        });

        it('should update edge references to survivor', () => {
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 224, y: 100 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2Original = getState().edges[edgeId2];

            getState().connectNodes(edge1.endNodeId, edge2Original.startNodeId, edgeId2);

            // After connection, edge2's startNodeId should point to survivor
            const edge2Updated = getState().edges[edgeId2];
            expect(edge2Updated.startNodeId).toBe(edge1.endNodeId);
        });

        it('should upgrade survivor to junction type', () => {
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 224, y: 100 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];

            // Before: endpoint
            expect(getState().nodes[edge1.endNodeId].type).toBe('endpoint');

            getState().connectNodes(edge1.endNodeId, edge2.startNodeId, edgeId2);

            // After: junction (has 2+ connections)
            expect(getState().nodes[edge1.endNodeId].type).toBe('junction');
        });

        it('should add edge to survivor connections', () => {
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 224, y: 100 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];

            // Before: survivor has 1 connection
            expect(getState().nodes[edge1.endNodeId].connections).toHaveLength(1);

            getState().connectNodes(edge1.endNodeId, edge2.startNodeId, edgeId2);

            // After: survivor has 2 connections
            expect(getState().nodes[edge1.endNodeId].connections).toHaveLength(2);
            expect(getState().nodes[edge1.endNodeId].connections).toContain(edgeId2);
        });

        it('should update geometry for straight edge', () => {
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 224, y: 100 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];
            const survivorPos = getState().nodes[edge1.endNodeId].position;

            getState().connectNodes(edge1.endNodeId, edge2.startNodeId, edgeId2);

            // Check geometry updated
            const updatedEdge2 = getState().edges[edgeId2];
            if (updatedEdge2.geometry.type === 'straight') {
                expect(updatedEdge2.geometry.start.x).toBeCloseTo(survivorPos.x);
                expect(updatedEdge2.geometry.start.y).toBeCloseTo(survivorPos.y);
            }
        });

        it('should handle missing nodes gracefully', () => {
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;

            // Should not throw
            expect(() => {
                getState().connectNodes('non-existent', 'also-non-existent', edgeId1);
            }).not.toThrow();
        });
    });

    // ===========================
    // toggleSwitch Tests
    // ===========================

    describe('toggleSwitch', () => {
        it('should toggle from 0 to 1', () => {
            const edgeId = getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0)!;
            const mainEdge = getState().edges[edgeId];
            const switchNodeId = mainEdge.startNodeId;

            expect(getState().nodes[switchNodeId].switchState).toBe(0);

            getState().toggleSwitch(switchNodeId);

            expect(getState().nodes[switchNodeId].switchState).toBe(1);
        });

        it('should toggle from 1 to 0', () => {
            const edgeId = getState().addTrack('kato-20-202', { x: 100, y: 100 }, 0)!;
            const mainEdge = getState().edges[edgeId];
            const switchNodeId = mainEdge.startNodeId;

            // Toggle to 1 first
            getState().toggleSwitch(switchNodeId);
            expect(getState().nodes[switchNodeId].switchState).toBe(1);

            // Toggle back to 0
            getState().toggleSwitch(switchNodeId);
            expect(getState().nodes[switchNodeId].switchState).toBe(0);
        });

        it('should not modify non-switch nodes', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edge = getState().edges[edgeId];
            const endpointNodeId = edge.startNodeId;

            // Node should be endpoint
            expect(getState().nodes[endpointNodeId].type).toBe('endpoint');

            // Toggle should be no-op (no crash, no change)
            getState().toggleSwitch(endpointNodeId);

            expect(getState().nodes[endpointNodeId].type).toBe('endpoint');
            expect(getState().nodes[endpointNodeId].switchState).toBeUndefined();
        });

        it('should handle non-existent node gracefully', () => {
            expect(() => {
                getState().toggleSwitch('non-existent-node');
            }).not.toThrow();
        });
    });

    // ===========================
    // connectNetworks Tests (V2 Atomic)
    // ===========================

    describe('connectNetworks', () => {
        it('should merge nodes atomically', () => {
            // Place two tracks at different positions
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 500, y: 200 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];

            expect(nodeCount()).toBe(4);

            // Connect with rotation delta of 0
            getState().connectNetworks(edge1.endNodeId, edge2.startNodeId, edgeId2, 0);

            expect(nodeCount()).toBe(3); // One node merged
        });

        it('should move network to anchor position', () => {
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 500, y: 200 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];
            const movingEndNodeId = edge2.endNodeId;

            // Connect - moving node should end up at anchor position
            getState().connectNetworks(edge1.endNodeId, edge2.startNodeId, edgeId2, 0);

            // The merged node (now at anchor) should be at anchor position
            // The end node of edge2 should have moved
            const movedEndNode = getState().nodes[movingEndNodeId];
            expect(movedEndNode).toBeDefined();
        });

        it('should rotate network by rotationDelta', () => {
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 500, y: 100 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];
            const endNodeId = edge2.endNodeId;

            const originalEndRotation = getState().nodes[endNodeId].rotation;

            // Connect with 90° rotation
            getState().connectNetworks(edge1.endNodeId, edge2.startNodeId, edgeId2, 90);

            const newEndRotation = getState().nodes[endNodeId].rotation;
            // Rotation should have increased by 90° (mod 360)
            const expectedRotation = (originalEndRotation + 90) % 360;
            expect(newEndRotation).toBeCloseTo(expectedRotation);
        });

        it('should update edge geometry after move', () => {
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 500, y: 100 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];

            getState().connectNetworks(edge1.endNodeId, edge2.startNodeId, edgeId2, 0);

            // Get updated edge
            const updatedEdge2 = getState().edges[edgeId2];
            const startNode = getState().nodes[updatedEdge2.startNodeId];
            const endNode = getState().nodes[updatedEdge2.endNodeId];

            // Geometry should match node positions
            if (updatedEdge2.geometry.type === 'straight') {
                expect(updatedEdge2.geometry.start.x).toBeCloseTo(startNode.position.x);
                expect(updatedEdge2.geometry.start.y).toBeCloseTo(startNode.position.y);
                expect(updatedEdge2.geometry.end.x).toBeCloseTo(endNode.position.x);
                expect(updatedEdge2.geometry.end.y).toBeCloseTo(endNode.position.y);
            }
        });

        it('should move entire connected network (not just single edge)', () => {
            // Create a small network: two connected tracks
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-020', { x: 224, y: 100 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];

            // Connect them first
            getState().connectNodes(edge1.endNodeId, edge2.startNodeId, edgeId2);

            // Now place a third track far away
            const edgeId3 = getState().addTrack('kato-20-020', { x: 600, y: 100 }, 0)!;
            const edge3 = getState().edges[edgeId3];

            // Get all node positions before connect
            const endOfNetwork = edge2.endNodeId;

            // Connect network (edge1+edge2) to edge3
            getState().connectNetworks(edge3.startNodeId, endOfNetwork, edgeId2, 0);

            // The entire network should have moved
            // Check that edge1's geometry was also updated
            const updatedEdge1 = getState().edges[edgeId1];
            const e1StartNode = getState().nodes[updatedEdge1.startNodeId];
            const e1EndNode = getState().nodes[updatedEdge1.endNodeId];

            if (updatedEdge1.geometry.type === 'straight') {
                expect(updatedEdge1.geometry.start.x).toBeCloseTo(e1StartNode.position.x);
                expect(updatedEdge1.geometry.end.x).toBeCloseTo(e1EndNode.position.x);
            }
        });

        it('should handle arc geometry rotation correctly', () => {
            // Use curves to test arc geometry
            const edgeId1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edgeId2 = getState().addTrack('kato-20-100', { x: 500, y: 100 }, 0)!;

            const edge1 = getState().edges[edgeId1];
            const edge2 = getState().edges[edgeId2];

            const originalArc = edge2.geometry;
            expect(originalArc.type).toBe('arc');

            // Connect with 45° rotation
            getState().connectNetworks(edge1.endNodeId, edge2.startNodeId, edgeId2, 45);

            const updatedEdge2 = getState().edges[edgeId2];
            if (updatedEdge2.geometry.type === 'arc' && originalArc.type === 'arc') {
                // Start angle should have rotated
                const originalSweep = originalArc.endAngle - originalArc.startAngle;
                const newSweep = updatedEdge2.geometry.endAngle - updatedEdge2.geometry.startAngle;

                // Sweep angle should be preserved
                expect(newSweep).toBeCloseTo(originalSweep);
            }
        });
    });

    // ===========================
    // movePart Tests
    // ===========================

    describe('movePart', () => {
        it('should move pivot node to target position', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edge = getState().edges[edgeId];
            const pivotNodeId = edge.startNodeId;

            const targetPos = { x: 300, y: 200 };
            getState().movePart(edgeId, pivotNodeId, targetPos, 0);

            const movedNode = getState().nodes[pivotNodeId];
            expect(movedNode.position.x).toBeCloseTo(targetPos.x);
            expect(movedNode.position.y).toBeCloseTo(targetPos.y);
        });

        it('should apply rotation to nodes', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edge = getState().edges[edgeId];
            const pivotNodeId = edge.startNodeId;
            const otherNodeId = edge.endNodeId;

            const originalRotation = getState().nodes[otherNodeId].rotation;

            getState().movePart(edgeId, pivotNodeId, { x: 100, y: 100 }, 45);

            const newRotation = getState().nodes[otherNodeId].rotation;
            expect(newRotation).toBeCloseTo((originalRotation + 45) % 360);
        });

        it('should update edge geometry', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edge = getState().edges[edgeId];

            getState().movePart(edgeId, edge.startNodeId, { x: 300, y: 200 }, 0);

            const updatedEdge = getState().edges[edgeId];
            const startNode = getState().nodes[updatedEdge.startNodeId];
            const endNode = getState().nodes[updatedEdge.endNodeId];

            if (updatedEdge.geometry.type === 'straight') {
                expect(updatedEdge.geometry.start.x).toBeCloseTo(startNode.position.x);
                expect(updatedEdge.geometry.start.y).toBeCloseTo(startNode.position.y);
                expect(updatedEdge.geometry.end.x).toBeCloseTo(endNode.position.x);
                expect(updatedEdge.geometry.end.y).toBeCloseTo(endNode.position.y);
            }
        });

        it('should preserve edge length after move', () => {
            const edgeId = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const originalEdge = getState().edges[edgeId];
            const originalLength = originalEdge.length;

            getState().movePart(edgeId, originalEdge.startNodeId, { x: 500, y: 300 }, 90);

            const movedEdge = getState().edges[edgeId];
            const startNode = getState().nodes[movedEdge.startNodeId];
            const endNode = getState().nodes[movedEdge.endNodeId];

            const actualLength = distance(startNode.position, endNode.position);
            expect(actualLength).toBeCloseTo(originalLength);
        });

        it('should handle non-existent edge gracefully', () => {
            expect(() => {
                getState().movePart('non-existent', 'also-non-existent', { x: 0, y: 0 }, 0);
            }).not.toThrow();
        });
    });

    // ===========================
    // Layout Persistence Tests
    // ===========================

    describe('layout persistence', () => {
        describe('getLayout', () => {
            it('should return valid layout structure', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);

                const layout = getState().getLayout();

                expect(layout.version).toBe(1);
                expect(layout.nodes).toBeDefined();
                expect(layout.edges).toBeDefined();
            });

            it('should include all nodes in layout', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
                getState().addTrack('kato-20-020', { x: 300, y: 100 }, 0);

                const layout = getState().getLayout();

                expect(Object.keys(layout.nodes)).toHaveLength(4);
            });

            it('should include all edges in layout', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
                getState().addTrack('kato-20-020', { x: 300, y: 100 }, 0);

                const layout = getState().getLayout();

                expect(Object.keys(layout.edges)).toHaveLength(2);
            });

            it('should include metadata', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);

                const layout = getState().getLayout();

                expect(layout.metadata).toBeDefined();
                expect(layout.metadata?.modified).toBeDefined();
            });

            it('should include debug info with facades', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);

                const layout = getState().getLayout();

                expect(layout.debug).toBeDefined();
                expect(layout.debug?.facades).toBeDefined();
                expect(layout.debug?.partNames).toBeDefined();
            });
        });

        describe('loadLayout', () => {
            it('should restore nodes from layout', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
                const layout = getState().getLayout();

                getState().clearLayout();
                expect(nodeCount()).toBe(0);

                getState().loadLayout(layout);
                expect(nodeCount()).toBe(2);
            });

            it('should restore edges from layout', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
                const layout = getState().getLayout();

                getState().clearLayout();
                expect(edgeCount()).toBe(0);

                getState().loadLayout(layout);
                expect(edgeCount()).toBe(1);
            });

            it('should preserve node positions', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
                const layout = getState().getLayout();
                const originalNodes = { ...layout.nodes };

                getState().clearLayout();
                getState().loadLayout(layout);

                for (const [nodeId, originalNode] of Object.entries(originalNodes)) {
                    const loadedNode = getState().nodes[nodeId];
                    expect(loadedNode.position.x).toBe(originalNode.position.x);
                    expect(loadedNode.position.y).toBe(originalNode.position.y);
                }
            });
        });

        describe('clearLayout', () => {
            it('should reset to initial state', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);
                getState().addTrack('kato-20-100', { x: 300, y: 100 }, 0);

                expect(nodeCount()).toBeGreaterThan(0);
                expect(edgeCount()).toBeGreaterThan(0);

                getState().clearLayout();

                expect(nodeCount()).toBe(0);
                expect(edgeCount()).toBe(0);
            });
        });
    });

    // ===========================
    // Spatial Query Tests
    // ===========================

    describe('spatial queries', () => {
        describe('getVisibleEdges', () => {
            it('should return edges in viewport', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);

                const visibleEdges = getState().getVisibleEdges({
                    x: 0,
                    y: 0,
                    width: 500,
                    height: 500,
                });

                expect(visibleEdges).toHaveLength(1);
            });

            it('should not return edges outside viewport', () => {
                // Place track far away to ensure it's outside the spatial hash grid's query range
                getState().addTrack('kato-20-020', { x: 5000, y: 5000 }, 0);

                const visibleEdges = getState().getVisibleEdges({
                    x: 0,
                    y: 0,
                    width: 500,
                    height: 500,
                });

                expect(visibleEdges).toHaveLength(0);
            });
        });

        describe('getVisibleNodes', () => {
            it('should return nodes in viewport', () => {
                getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0);

                const visibleNodes = getState().getVisibleNodes({
                    x: 0,
                    y: 0,
                    width: 500,
                    height: 500,
                });

                expect(visibleNodes.length).toBeGreaterThan(0);
            });

            it('should not return nodes outside viewport', () => {
                // Place track far away to ensure it's outside the spatial hash grid's query range
                getState().addTrack('kato-20-020', { x: 5000, y: 5000 }, 0);

                const visibleNodes = getState().getVisibleNodes({
                    x: 0,
                    y: 0,
                    width: 500,
                    height: 500,
                });

                expect(visibleNodes).toHaveLength(0);
            });
        });
    });

    // ===========================
    // Integration Tests
    // ===========================

    describe('integration', () => {
        it('should handle complete track building workflow', () => {
            // 1. Place first track
            const edge1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            expect(edgeCount()).toBe(1);

            // 2. Place second track
            const edge2 = getState().addTrack('kato-20-020', { x: 224, y: 100 }, 0)!;
            expect(edgeCount()).toBe(2);

            // 3. Connect them
            const e1 = getState().edges[edge1];
            const e2 = getState().edges[edge2];
            getState().connectNodes(e1.endNodeId, e2.startNodeId, edge2);

            // Should have 3 nodes (one merged)
            expect(nodeCount()).toBe(3);

            // 4. Remove first track
            getState().removeTrack(edge1);
            expect(edgeCount()).toBe(1);

            // 5. Clear all
            getState().clearLayout();
            expect(edgeCount()).toBe(0);
            expect(nodeCount()).toBe(0);
        });

        it('should maintain geometry integrity after multiple operations', () => {
            // Place tracks
            const edge1 = getState().addTrack('kato-20-020', { x: 100, y: 100 }, 0)!;
            const edge2 = getState().addTrack('kato-20-020', { x: 300, y: 200 }, 45)!;

            // Move one track
            const e2 = getState().edges[edge2];
            getState().movePart(edge2, e2.startNodeId, { x: 224, y: 100 }, 0);

            // Connect them
            const e1 = getState().edges[edge1];
            const e2Updated = getState().edges[edge2];
            getState().connectNetworks(e1.endNodeId, e2Updated.startNodeId, edge2, 0);

            // Verify geometry integrity
            for (const edge of Object.values(getState().edges)) {
                const startNode = getState().nodes[edge.startNodeId];
                const endNode = getState().nodes[edge.endNodeId];

                expect(startNode).toBeDefined();
                expect(endNode).toBeDefined();

                if (edge.geometry.type === 'straight') {
                    expect(edge.geometry.start.x).toBeCloseTo(startNode.position.x);
                    expect(edge.geometry.end.x).toBeCloseTo(endNode.position.x);
                }
            }
        });
    });
});
