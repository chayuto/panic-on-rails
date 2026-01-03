import { describe, test, expect } from 'vitest';
import {
    pointToLineDistance,
    pointToArcDistance,
    findClosestEdge,
    findClosestNode,
} from '../hitTesting';
import type { TrackEdge, TrackNode } from '../../types';

describe('pointToLineDistance', () => {
    test('point on the line returns 0', () => {
        const distance = pointToLineDistance(
            { x: 50, y: 50 },
            { x: 0, y: 0 },
            { x: 100, y: 100 }
        );
        expect(distance).toBeCloseTo(0, 5);
    });

    test('point perpendicular to line midpoint', () => {
        // Line from (0,0) to (100,0)
        // Point at (50, 10) - directly above the midpoint
        const distance = pointToLineDistance(
            { x: 50, y: 10 },
            { x: 0, y: 0 },
            { x: 100, y: 0 }
        );
        expect(distance).toBeCloseTo(10, 5);
    });

    test('point past line end', () => {
        // Line from (0,0) to (100,0)
        // Point at (150, 0) - past the end
        const distance = pointToLineDistance(
            { x: 150, y: 0 },
            { x: 0, y: 0 },
            { x: 100, y: 0 }
        );
        expect(distance).toBeCloseTo(50, 5);
    });

    test('point before line start', () => {
        // Line from (0,0) to (100,0)
        // Point at (-50, 0) - before the start
        const distance = pointToLineDistance(
            { x: -50, y: 0 },
            { x: 0, y: 0 },
            { x: 100, y: 0 }
        );
        expect(distance).toBeCloseTo(50, 5);
    });

    test('point perpendicular to vertical line', () => {
        // Line from (0,0) to (0,100)
        // Point at (10, 50) - to the right of midpoint
        const distance = pointToLineDistance(
            { x: 10, y: 50 },
            { x: 0, y: 0 },
            { x: 0, y: 100 }
        );
        expect(distance).toBeCloseTo(10, 5);
    });

    test('degenerate line (zero length)', () => {
        // Line is a single point at (50, 50)
        const distance = pointToLineDistance(
            { x: 60, y: 50 },
            { x: 50, y: 50 },
            { x: 50, y: 50 }
        );
        expect(distance).toBeCloseTo(10, 5);
    });

    test('diagonal line with offset point', () => {
        // Line from (0,0) to (100,100) - 45 degree angle
        // Point at (0, 100) - corner of the square
        // Distance should be 100 / sqrt(2) ≈ 70.71 to midpoint,
        // but since point is outside the segment, it's distance to (0,0) or (100,100)
        const distance = pointToLineDistance(
            { x: 0, y: 100 },
            { x: 0, y: 0 },
            { x: 100, y: 100 }
        );
        // Point is closest to line at (50,50), distance ≈ 70.71
        expect(distance).toBeCloseTo(70.71, 1);
    });
});

describe('pointToArcDistance', () => {
    const center = { x: 100, y: 100 };
    const radius = 50;
    const startAngle = 0;
    const endAngle = Math.PI / 2; // 90 degree arc

    test('point exactly on the arc', () => {
        // Point at (150, 100) - on the arc at 0 radians
        const distance = pointToArcDistance(
            { x: 150, y: 100 },
            center,
            radius,
            startAngle,
            endAngle
        );
        expect(distance).toBeCloseTo(0, 5);
    });

    test('point inside the arc radius', () => {
        // Point at (140, 100) - inside the arc at 0 radians
        const distance = pointToArcDistance(
            { x: 140, y: 100 },
            center,
            radius,
            startAngle,
            endAngle
        );
        expect(distance).toBeCloseTo(10, 5);
    });

    test('point outside the arc radius', () => {
        // Point at (160, 100) - outside the arc at 0 radians
        const distance = pointToArcDistance(
            { x: 160, y: 100 },
            center,
            radius,
            startAngle,
            endAngle
        );
        expect(distance).toBeCloseTo(10, 5);
    });

    test('point outside arc angular range', () => {
        // Point at (100, 50) - at -90 degrees (outside 0-90 degree arc)
        // Should return distance to nearest endpoint
        const distance = pointToArcDistance(
            { x: 100, y: 50 },
            center,
            radius,
            startAngle,
            endAngle
        );
        // Nearest endpoint is (150, 100) at angle 0
        const expectedDist = Math.sqrt(Math.pow(100 - 150, 2) + Math.pow(50 - 100, 2));
        expect(distance).toBeCloseTo(expectedDist, 5);
    });
});

describe('findClosestEdge', () => {
    // Create mock edges and nodes
    const nodes: Record<string, TrackNode> = {
        'n1': { id: 'n1', position: { x: 0, y: 0 }, rotation: 0, connections: ['e1'], type: 'endpoint' },
        'n2': { id: 'n2', position: { x: 100, y: 0 }, rotation: 0, connections: ['e1', 'e2'], type: 'junction' },
        'n3': { id: 'n3', position: { x: 100, y: 100 }, rotation: 0, connections: ['e2'], type: 'endpoint' },
    };

    const edges: Record<string, TrackEdge> = {
        'e1': {
            id: 'e1',
            partId: 'p1',
            startNodeId: 'n1',
            endNodeId: 'n2',
            geometry: { type: 'straight', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
            length: 100,
        },
        'e2': {
            id: 'e2',
            partId: 'p1',
            startNodeId: 'n2',
            endNodeId: 'n3',
            geometry: { type: 'straight', start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
            length: 100,
        },
    };

    test('finds closest edge when point is near', () => {
        // Point at (50, 5) - 5 pixels above the horizontal edge
        const result = findClosestEdge(['e1', 'e2'], { x: 50, y: 5 }, edges, nodes, 15);

        expect(result).not.toBeNull();
        expect(result!.edgeId).toBe('e1');
        expect(result!.distance).toBeCloseTo(5, 5);
    });

    test('returns null when point is too far from all edges', () => {
        // Point at (50, 100) - 100 pixels below the horizontal edge
        const result = findClosestEdge(['e1'], { x: 50, y: 100 }, edges, nodes, 15);

        expect(result).toBeNull();
    });

    test('returns closer edge when multiple are within threshold', () => {
        // Point at (100, 10) - near the junction of both edges
        // Should return e2 (vertical edge) since point is 10px from it
        const result = findClosestEdge(['e1', 'e2'], { x: 110, y: 50 }, edges, nodes, 15);

        expect(result).not.toBeNull();
        expect(result!.edgeId).toBe('e2');
    });

    test('handles empty candidate list', () => {
        const result = findClosestEdge([], { x: 50, y: 0 }, edges, nodes, 15);
        expect(result).toBeNull();
    });

    test('handles non-existent edge IDs', () => {
        const result = findClosestEdge(['nonexistent'], { x: 50, y: 0 }, edges, nodes, 15);
        expect(result).toBeNull();
    });

    test('calculates t value indicating position along edge', () => {
        // Point at (75, 0) - 3/4 along the horizontal edge
        const result = findClosestEdge(['e1'], { x: 75, y: 0 }, edges, nodes, 15);

        expect(result).not.toBeNull();
        expect(result!.t).toBeCloseTo(0.75, 2);
    });
});

describe('findClosestNode', () => {
    const nodes: Record<string, TrackNode> = {
        'n1': { id: 'n1', position: { x: 50, y: 50 }, rotation: 0, connections: ['e1'], type: 'endpoint' },
        'n2': { id: 'n2', position: { x: 150, y: 50 }, rotation: 0, connections: ['e1'], type: 'switch', switchState: 0 },
        'n3': { id: 'n3', position: { x: 250, y: 50 }, rotation: 0, connections: [], type: 'endpoint' },
    };

    test('finds closest node when point is near', () => {
        // Point at (55, 50) - 5 pixels from n1
        const result = findClosestNode(['n1', 'n2', 'n3'], { x: 55, y: 50 }, nodes, 12);

        expect(result).not.toBeNull();
        expect(result!.nodeId).toBe('n1');
        expect(result!.distance).toBeCloseTo(5, 5);
    });

    test('returns null when point is too far', () => {
        // Point at (100, 100) - far from all nodes
        const result = findClosestNode(['n1', 'n2', 'n3'], { x: 100, y: 100 }, nodes, 12);

        expect(result).toBeNull();
    });

    test('returns closer node when multiple are within threshold', () => {
        // Point at (148, 50) - closer to n2 (2px) than n1 (98px)
        const result = findClosestNode(['n1', 'n2'], { x: 148, y: 50 }, nodes, 12);

        expect(result).not.toBeNull();
        expect(result!.nodeId).toBe('n2');
    });

    test('handles empty candidate list', () => {
        const result = findClosestNode([], { x: 50, y: 50 }, nodes, 12);
        expect(result).toBeNull();
    });
});
