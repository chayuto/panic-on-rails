import { describe, it, expect } from 'vitest';
import {
    calculateRotationForConnection,
    getNodeOffsetFromOrigin,
    getPartOrigin,
    getPartRotation,
    calculateConnectionTransform,
    rotateNodeAroundPivot,
    validateConnection,
    getNodeConnectorType,
    getNodeFacadeFromEdge,
} from '../connectTransform';
import type { TrackNode, TrackEdge } from '../../types';

// ===========================
// Mock Data
// ===========================

const mockNodes: Record<string, TrackNode> = {
    'node-a1': {
        id: 'node-a1',
        position: { x: 100, y: 100 },
        rotation: 180,
        connections: ['edge-a'],
        type: 'endpoint',
    },
    'node-a2': {
        id: 'node-a2',
        position: { x: 200, y: 100 },
        rotation: 0,
        connections: ['edge-a'],
        type: 'endpoint',
    },
    'node-b1': {
        id: 'node-b1',
        position: { x: 300, y: 200 },
        rotation: 180,
        connections: ['edge-b'],
        type: 'endpoint',
    },
    'node-b2': {
        id: 'node-b2',
        position: { x: 400, y: 200 },
        rotation: 0,
        connections: ['edge-b'],
        type: 'endpoint',
    },
    'node-junction': {
        id: 'node-junction',
        position: { x: 500, y: 100 },
        rotation: 0,
        connections: ['edge-c', 'edge-d'],
        type: 'junction',
    },
};

const mockEdges: Record<string, TrackEdge> = {
    'edge-a': {
        id: 'edge-a',
        partId: 'part-a',
        startNodeId: 'node-a1',
        endNodeId: 'node-a2',
        geometry: {
            type: 'straight',
            start: { x: 100, y: 100 },
            end: { x: 200, y: 100 },
        },
        length: 100,
    },
    'edge-b': {
        id: 'edge-b',
        partId: 'part-b',
        startNodeId: 'node-b1',
        endNodeId: 'node-b2',
        geometry: {
            type: 'straight',
            start: { x: 300, y: 200 },
            end: { x: 400, y: 200 },
        },
        length: 100,
    },
    'edge-same-part': {
        id: 'edge-same-part',
        partId: 'part-a',  // Same partId as edge-a
        startNodeId: 'node-a1',
        endNodeId: 'node-a2',
        geometry: {
            type: 'straight',
            start: { x: 100, y: 100 },
            end: { x: 200, y: 100 },
        },
        length: 100,
    },
};

// ===========================
// Node Connector Type Tests
// ===========================

describe('getNodeConnectorType', () => {
    it('returns "start" for the start node of an edge', () => {
        const type = getNodeConnectorType('node-a1', mockEdges['edge-a']);
        expect(type).toBe('start');
    });

    it('returns "end" for the end node of an edge', () => {
        const type = getNodeConnectorType('node-a2', mockEdges['edge-a']);
        expect(type).toBe('end');
    });
});

// ===========================
// Facade From Edge Tests
// ===========================

describe('getNodeFacadeFromEdge', () => {
    it('returns correct facade for start of horizontal straight track', () => {
        // Track goes from (100, 100) to (200, 100) - pointing east (0°)
        // Start node facade should point opposite (west = 180°)
        const facade = getNodeFacadeFromEdge('node-a1', mockEdges['edge-a']);
        expect(facade).toBeCloseTo(180);
    });

    it('returns correct facade for end of horizontal straight track', () => {
        // Track goes from (100, 100) to (200, 100) - pointing east (0°)
        // End node facade should point same direction (east = 0°)
        const facade = getNodeFacadeFromEdge('node-a2', mockEdges['edge-a']);
        expect(facade).toBeCloseTo(0);
    });

    it('returns correct facade for arc edge at start node', () => {
        // Arc with center at (0, 0), radius 100, start angle 90°, end angle 180°
        const arcEdge: TrackEdge = {
            id: 'arc-edge',
            partId: 'arc-part',
            startNodeId: 'arc-start',
            endNodeId: 'arc-end',
            geometry: {
                type: 'arc',
                center: { x: 0, y: 0 },
                radius: 100,
                startAngle: 90,  // Point is at (0, 100)
                endAngle: 180,   // Point is at (-100, 0)
            },
            length: 157,
        };
        // At startAngle 90°, tangent is 90° + 90° = 180°
        // Start facade = opposite of tangent = 180° + 180° = 360° = 0°
        const facade = getNodeFacadeFromEdge('arc-start', arcEdge);
        expect(facade).toBeCloseTo(0);
    });

    it('returns correct facade for arc edge at end node', () => {
        const arcEdge: TrackEdge = {
            id: 'arc-edge',
            partId: 'arc-part',
            startNodeId: 'arc-start',
            endNodeId: 'arc-end',
            geometry: {
                type: 'arc',
                center: { x: 0, y: 0 },
                radius: 100,
                startAngle: 90,
                endAngle: 180,
            },
            length: 157,
        };
        // At endAngle 180°, tangent is 180° + 90° = 270°
        // End facade = same as tangent = 270°
        const facade = getNodeFacadeFromEdge('arc-end', arcEdge);
        expect(facade).toBeCloseTo(270);
    });
});

// ===========================
// Rotation Calculation Tests
// ===========================

describe('calculateRotationForConnection', () => {
    it('returns 0 when facades are already correctly aligned', () => {
        // Target faces 0°, source faces 180° = already correct
        const delta = calculateRotationForConnection(0, 180);
        expect(delta).toBe(0);
    });

    it('returns 180 when facades are same direction', () => {
        // Both face 0° = need 180° rotation
        const delta = calculateRotationForConnection(0, 0);
        expect(delta).toBe(180);
    });

    it('returns 90 for perpendicular facades needing quarter turn', () => {
        // Target faces 0° (east), source faces 270° (south)
        // Required source facade = 180° (west)
        // Delta = 180 - 270 = -90 = 270° normalized
        const delta = calculateRotationForConnection(0, 270);
        expect(delta).toBe(270);
    });

    it('handles wrap-around correctly', () => {
        // Target faces 350°, source faces 170°
        // Required = 350 + 180 = 530 = 170° (already matches!)
        const delta = calculateRotationForConnection(350, 170);
        expect(delta).toBe(0);
    });

    it('calculates 180° alignment even with isYJunction flag (deprecated)', () => {
        // isYJunction parameter is now ignored - always calculates for smooth continuation
        // Both face 180° = need 180° rotation to align at 180° apart
        const delta1 = calculateRotationForConnection(180, 180, true);
        expect(delta1).toBe(180);

        // Facades 0° (target) and 45° (source)
        // Required source = 180°, delta = 180 - 45 = 135°
        const delta2 = calculateRotationForConnection(0, 45, true);
        expect(delta2).toBe(135);

        // Facades 0° (target) and 180° (source) = already aligned
        const delta3 = calculateRotationForConnection(0, 180, true);
        expect(delta3).toBe(0);

        // Facades 0° (target) and 100° (source)
        // Required source = 180°, delta = 180 - 100 = 80°
        const delta4 = calculateRotationForConnection(0, 100, true);
        expect(delta4).toBe(80);
    });
});

// ===========================
// Node Offset Tests
// ===========================

describe('getNodeOffsetFromOrigin', () => {
    it('returns correct offset for a node', () => {
        const origin = { x: 100, y: 100 };
        const offset = getNodeOffsetFromOrigin('node-a2', mockNodes, origin);
        expect(offset.x).toBe(100);  // 200 - 100
        expect(offset.y).toBe(0);    // 100 - 100
    });

    it('returns zero for origin node', () => {
        const origin = { x: 100, y: 100 };
        const offset = getNodeOffsetFromOrigin('node-a1', mockNodes, origin);
        expect(offset.x).toBe(0);
        expect(offset.y).toBe(0);
    });

    it('returns zero for non-existent node', () => {
        const origin = { x: 0, y: 0 };
        const offset = getNodeOffsetFromOrigin('non-existent', mockNodes, origin);
        expect(offset.x).toBe(0);
        expect(offset.y).toBe(0);
    });
});

// ===========================
// Part Origin Tests
// ===========================

describe('getPartOrigin', () => {
    it('returns start node position as origin', () => {
        const origin = getPartOrigin(mockEdges['edge-a'], mockNodes);
        expect(origin.x).toBe(100);
        expect(origin.y).toBe(100);
    });
});

// ===========================
// Part Rotation Tests
// ===========================

describe('getPartRotation', () => {
    it('calculates rotation for horizontal straight track', () => {
        const rotation = getPartRotation(mockEdges['edge-a']);
        expect(rotation).toBe(0);  // Points east
    });

    it('calculates rotation for vertical straight track', () => {
        const verticalEdge: TrackEdge = {
            id: 'vert',
            partId: 'p',
            startNodeId: 'n1',
            endNodeId: 'n2',
            geometry: {
                type: 'straight',
                start: { x: 0, y: 0 },
                end: { x: 0, y: 100 },
            },
            length: 100,
        };
        const rotation = getPartRotation(verticalEdge);
        expect(rotation).toBe(90);  // Points south
    });
});

// ===========================
// Rotate Around Pivot Tests
// ===========================

describe('rotateNodeAroundPivot', () => {
    it('rotates point 90 degrees around origin', () => {
        const result = rotateNodeAroundPivot(
            { x: 10, y: 0 },
            { x: 0, y: 0 },
            90
        );
        expect(result.x).toBeCloseTo(0);
        expect(result.y).toBeCloseTo(10);
    });

    it('rotates point 180 degrees around origin', () => {
        const result = rotateNodeAroundPivot(
            { x: 10, y: 0 },
            { x: 0, y: 0 },
            180
        );
        expect(result.x).toBeCloseTo(-10);
        expect(result.y).toBeCloseTo(0);
    });

    it('rotates around non-origin pivot', () => {
        // Rotate (10, 5) around (5, 5) by 180°
        // Distance from pivot = 5, should end up at (0, 5)
        const result = rotateNodeAroundPivot(
            { x: 10, y: 5 },
            { x: 5, y: 5 },
            180
        );
        expect(result.x).toBeCloseTo(0);
        expect(result.y).toBeCloseTo(5);
    });
});

// ===========================
// Validate Connection Tests
// ===========================

describe('validateConnection', () => {
    it('accepts valid connection between different parts', () => {
        const result = validateConnection(
            mockNodes['node-a1'],
            mockNodes['node-b1'],
            mockEdges
        );
        expect(result.isValid).toBe(true);
    });

    it('rejects connection where source has multiple connections', () => {
        const result = validateConnection(
            mockNodes['node-junction'],
            mockNodes['node-b1'],
            mockEdges
        );
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Source node');
    });

    it('rejects connection where target has multiple connections', () => {
        const result = validateConnection(
            mockNodes['node-a1'],
            mockNodes['node-junction'],
            mockEdges
        );
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Target node');
    });

    it('rejects connection between nodes of same part', () => {
        // Create nodes that belong to the same part
        const samePartNodes: Record<string, TrackNode> = {
            'node-1': {
                id: 'node-1',
                position: { x: 0, y: 0 },
                rotation: 180,
                connections: ['edge-same'],
                type: 'endpoint',
            },
            'node-2': {
                id: 'node-2',
                position: { x: 100, y: 0 },
                rotation: 0,
                connections: ['edge-same'],
                type: 'endpoint',
            },
        };
        const samePartEdges: Record<string, TrackEdge> = {
            'edge-same': {
                id: 'edge-same',
                partId: 'same-part-id',
                startNodeId: 'node-1',
                endNodeId: 'node-2',
                geometry: {
                    type: 'straight',
                    start: { x: 0, y: 0 },
                    end: { x: 100, y: 0 },
                },
                length: 100,
            },
        };

        const result = validateConnection(
            samePartNodes['node-1'],
            samePartNodes['node-2'],
            samePartEdges
        );
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('itself');
    });
});

// ===========================
// Connection Transform Tests
// ===========================

describe('calculateConnectionTransform', () => {
    it('calculates correct transform for horizontal alignment', () => {
        // Part A ends at (200, 100) facing east (0°)
        // Part B starts at (300, 200) facing west (180°)
        // To connect B to A, B needs to move so its start is at (200, 100)
        const transform = calculateConnectionTransform(
            mockNodes['node-a2'], // Target: Part A's end
            mockNodes['node-b1'], // Source: Part B's start
            mockEdges['edge-b'],
            mockNodes
        );

        // Source facade (180°) should become opposite of target (0° + 180° = 180°)
        // So rotation delta should be 0
        expect(transform.rotation).toBeCloseTo(0);

        // The transform positions Part B so that node-b1 ends up at node-a2's position
        // Since rotation is 0, and node-b1 is at the start of edge-b,
        // the new origin should place node-b1 at (200, 100)
        // node-b1 is at position (300, 200) with origin at (300, 200)
        // offset = (0, 0), so new position should be (200, 100)
        expect(transform.position.x).toBeCloseTo(200);
        expect(transform.position.y).toBeCloseTo(100);
    });
});
