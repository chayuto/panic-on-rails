import { describe, it, expect } from 'vitest';
import {
    localToWorld,
    rotateAroundPivot,
    calculateEndpointFromPose,
} from '../geometry';
import type { PartGeometry } from '../../types';

// ===========================
// Local to World Transform Tests
// ===========================

describe('localToWorld', () => {
    it('should transform with no rotation', () => {
        const result = localToWorld({ x: 10, y: 0 }, { x: 100, y: 100 }, 0);
        expect(result.x).toBeCloseTo(110);
        expect(result.y).toBeCloseTo(100);
    });

    it('should transform with 90 degree rotation', () => {
        const result = localToWorld({ x: 10, y: 0 }, { x: 100, y: 100 }, 90);
        expect(result.x).toBeCloseTo(100);
        expect(result.y).toBeCloseTo(110);
    });

    it('should transform with 180 degree rotation', () => {
        const result = localToWorld({ x: 10, y: 0 }, { x: 100, y: 100 }, 180);
        expect(result.x).toBeCloseTo(90);
        expect(result.y).toBeCloseTo(100);
    });

    it('should transform with 270 degree rotation', () => {
        const result = localToWorld({ x: 10, y: 0 }, { x: 100, y: 100 }, 270);
        expect(result.x).toBeCloseTo(100);
        expect(result.y).toBeCloseTo(90);
    });

    it('should handle origin at local origin', () => {
        const result = localToWorld({ x: 0, y: 0 }, { x: 50, y: 50 }, 45);
        expect(result.x).toBeCloseTo(50);
        expect(result.y).toBeCloseTo(50);
    });

    it('should handle 45 degree rotation', () => {
        const result = localToWorld({ x: 10, y: 0 }, { x: 0, y: 0 }, 45);
        const expected = 10 * Math.cos(Math.PI / 4);
        expect(result.x).toBeCloseTo(expected);
        expect(result.y).toBeCloseTo(expected);
    });
});

// ===========================
// Rotate Around Pivot Tests
// ===========================

describe('rotateAroundPivot', () => {
    it('should rotate point 90 degrees around origin', () => {
        const result = rotateAroundPivot({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
        expect(result.x).toBeCloseTo(0);
        expect(result.y).toBeCloseTo(10);
    });

    it('should rotate point 180 degrees around origin', () => {
        const result = rotateAroundPivot({ x: 10, y: 0 }, { x: 0, y: 0 }, 180);
        expect(result.x).toBeCloseTo(-10);
        expect(result.y).toBeCloseTo(0);
    });

    it('should rotate point around non-origin pivot', () => {
        // Point at (10, 5), pivot at (5, 5), rotate 180°
        // Should end up at (0, 5)
        const result = rotateAroundPivot({ x: 10, y: 5 }, { x: 5, y: 5 }, 180);
        expect(result.x).toBeCloseTo(0);
        expect(result.y).toBeCloseTo(5);
    });

    it('should return same point for 0 degree rotation', () => {
        const result = rotateAroundPivot({ x: 10, y: 5 }, { x: 0, y: 0 }, 0);
        expect(result.x).toBeCloseTo(10);
        expect(result.y).toBeCloseTo(5);
    });

    it('should return same point for 360 degree rotation', () => {
        const result = rotateAroundPivot({ x: 10, y: 5 }, { x: 0, y: 0 }, 360);
        expect(result.x).toBeCloseTo(10);
        expect(result.y).toBeCloseTo(5);
    });
});

// ===========================
// V2: Calculate Arc Center Tests
// ===========================

import { calculateArcCenter, deriveWorldGeometry } from '../geometry';
import type { TrackEdge, TrackNode } from '../../types';

describe('calculateArcCenter', () => {
    it('calculates center for 90° CCW arc at origin', () => {
        // Arc from (100, 0) to (0, 100) with radius 100, 90° CCW
        // Center should be at origin (0, 0)
        const center = calculateArcCenter(
            { x: 100, y: 0 },
            { x: 0, y: 100 },
            100,
            90,
            'ccw'
        );
        expect(center.x).toBeCloseTo(0, 0);
        expect(center.y).toBeCloseTo(0, 0);
    });

    it('calculates center for 90° CW arc at origin', () => {
        // Arc from (100, 0) to (0, -100) with radius 100, 90° CW
        // Center should be at origin (0, 0)
        const center = calculateArcCenter(
            { x: 100, y: 0 },
            { x: 0, y: -100 },
            100,
            90,
            'cw'
        );
        expect(center.x).toBeCloseTo(0, 0);
        expect(center.y).toBeCloseTo(0, 0);
    });

    it('calculates center for 180° semicircle', () => {
        // Semicircle from (100, 0) to (-100, 0) with radius 100
        // Center should be at (0, 0) for CCW or CW depending on direction
        const center = calculateArcCenter(
            { x: 100, y: 0 },
            { x: -100, y: 0 },
            100,
            180,
            'ccw'
        );
        expect(center.x).toBeCloseTo(0, 0);
        expect(center.y).toBeCloseTo(0, 0);
    });

    it('calculates center for 45° arc', () => {
        // 45° arc with radius 100
        // Start at (100, 0), end at (cos(45°)*100, sin(45°)*100) = (70.7, 70.7)
        // Center should be at approximately (0, 0)
        const endX = 100 * Math.cos(Math.PI / 4);
        const endY = 100 * Math.sin(Math.PI / 4);
        const center = calculateArcCenter(
            { x: 100, y: 0 },
            { x: endX, y: endY },
            100,
            45,
            'ccw'
        );
        expect(center.x).toBeCloseTo(0, 0);
        expect(center.y).toBeCloseTo(0, 0);
    });

    it('handles translated arc (not at origin)', () => {
        // Arc with center at (200, 200)
        // Start at (300, 200), end at (200, 300) - 90° CCW
        const center = calculateArcCenter(
            { x: 300, y: 200 },
            { x: 200, y: 300 },
            100,
            90,
            'ccw'
        );
        expect(center.x).toBeCloseTo(200, 0);
        expect(center.y).toBeCloseTo(200, 0);
    });

    it('handles degenerate case with same start and end', () => {
        const center = calculateArcCenter(
            { x: 100, y: 100 },
            { x: 100, y: 100 },
            50,
            45,
            'ccw'
        );
        // Should return midpoint (same as input in this case)
        expect(center.x).toBe(100);
        expect(center.y).toBe(100);
    });
});

// ===========================
// V2: Derive World Geometry Tests
// ===========================

describe('deriveWorldGeometry', () => {
    it('derives straight geometry from intrinsic', () => {
        const edge: TrackEdge = {
            id: 'e1',
            partId: 'p1',
            startNodeId: 'n1',
            endNodeId: 'n2',
            geometry: { type: 'straight', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
            length: 100,
            intrinsicGeometry: { type: 'straight', length: 100 },
        };

        const nodes: Record<string, TrackNode> = {
            'n1': { id: 'n1', position: { x: 50, y: 50 }, rotation: 0, connections: ['e1'], type: 'endpoint' },
            'n2': { id: 'n2', position: { x: 150, y: 50 }, rotation: 0, connections: ['e1'], type: 'endpoint' },
        };

        const world = deriveWorldGeometry(edge, nodes);

        expect(world?.type).toBe('straight');
        if (world?.type === 'straight') {
            expect(world.start.x).toBe(50);
            expect(world.start.y).toBe(50);
            expect(world.end.x).toBe(150);
            expect(world.end.y).toBe(50);
        }
    });

    it('derives arc geometry from intrinsic', () => {
        // Arc with center at origin, start at (100, 0), sweep 90° CCW
        // End should be at (0, 100)
        const edge: TrackEdge = {
            id: 'e1',
            partId: 'p1',
            startNodeId: 'n1',
            endNodeId: 'n2',
            geometry: { type: 'arc', center: { x: 0, y: 0 }, radius: 100, startAngle: 0, endAngle: 90 },
            length: 157,
            intrinsicGeometry: { type: 'arc', radius: 100, sweepAngle: 90, direction: 'ccw' },
        };

        const nodes: Record<string, TrackNode> = {
            'n1': { id: 'n1', position: { x: 100, y: 0 }, rotation: 90, connections: ['e1'], type: 'endpoint' },
            'n2': { id: 'n2', position: { x: 0, y: 100 }, rotation: 180, connections: ['e1'], type: 'endpoint' },
        };

        const world = deriveWorldGeometry(edge, nodes);

        expect(world?.type).toBe('arc');
        if (world?.type === 'arc') {
            expect(world.center.x).toBeCloseTo(0, 0);
            expect(world.center.y).toBeCloseTo(0, 0);
            expect(world.radius).toBe(100);
            expect(world.endAngle - world.startAngle).toBeCloseTo(90);
        }
    });

    it('falls back to stored geometry when no intrinsic', () => {
        const edge: TrackEdge = {
            id: 'e1',
            partId: 'p1',
            startNodeId: 'n1',
            endNodeId: 'n2',
            geometry: { type: 'straight', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
            length: 100,
            // No intrinsicGeometry
        };

        const nodes: Record<string, TrackNode> = {
            'n1': { id: 'n1', position: { x: 50, y: 50 }, rotation: 0, connections: ['e1'], type: 'endpoint' },
            'n2': { id: 'n2', position: { x: 150, y: 50 }, rotation: 0, connections: ['e1'], type: 'endpoint' },
        };

        const world = deriveWorldGeometry(edge, nodes);

        // Should return the stored geometry (not derived from nodes)
        expect(world?.type).toBe('straight');
        if (world?.type === 'straight') {
            expect(world.start.x).toBe(0);
            expect(world.start.y).toBe(0);
            expect(world.end.x).toBe(100);
            expect(world.end.y).toBe(0);
        }
    });

    it('returns null for missing nodes', () => {
        const edge: TrackEdge = {
            id: 'e1',
            partId: 'p1',
            startNodeId: 'n1',
            endNodeId: 'n2',
            geometry: { type: 'straight', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
            length: 100,
            intrinsicGeometry: { type: 'straight', length: 100 },
        };

        const nodes: Record<string, TrackNode> = {
            // Missing n1 and n2
        };

        const world = deriveWorldGeometry(edge, nodes);
        expect(world).toBeNull();
    });
});

// ===========================
// Calculate Endpoint From Pose Tests
// ===========================

describe('calculateEndpointFromPose', () => {
    it('calculates endpoint for straight track', () => {
        const geometry: PartGeometry = { type: 'straight', length: 100 };
        const end = calculateEndpointFromPose({ x: 0, y: 0 }, 0, geometry);
        expect(end.x).toBeCloseTo(100);
        expect(end.y).toBeCloseTo(0);
    });

    it('calculates endpoint for rotated straight track', () => {
        const geometry: PartGeometry = { type: 'straight', length: 100 };
        const end = calculateEndpointFromPose({ x: 0, y: 0 }, 90, geometry);
        expect(end.x).toBeCloseTo(0);
        expect(end.y).toBeCloseTo(100);
    });

    it('calculates endpoint for curve', () => {
        const geometry: PartGeometry = { type: 'curve', radius: 100, angle: 90 };
        // Validates preservation of coordinate logic from facadeConnection.ts
        const end = calculateEndpointFromPose({ x: 0, y: 0 }, 0, geometry);

        // As established, the existing logic produces (-100, -100) for a standard left curve
        // starting at (0,0) with 0 deg heading.
        expect(end.x).toBeCloseTo(-100);
        expect(end.y).toBeCloseTo(-100);
    });

    it('calculates endpoint for switch', () => {
        const geometry: PartGeometry = {
            type: 'switch',
            mainLength: 200,
            branchAngle: 15,
            branchDirection: 'left'
        };
        // Should behave like straight track of length 200
        const end = calculateEndpointFromPose({ x: 0, y: 0 }, 0, geometry);
        expect(end.x).toBeCloseTo(200);
        expect(end.y).toBeCloseTo(0);
    });

    it('calculates endpoint for crossing', () => {
        const geometry: PartGeometry = { type: 'crossing', length: 150, crossingAngle: 90 };
        // Should behave like straight track of length 150
        const end = calculateEndpointFromPose({ x: 0, y: 0 }, 0, geometry);
        expect(end.x).toBeCloseTo(150);
        expect(end.y).toBeCloseTo(0);
    });
});
