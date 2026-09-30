import { describe, it, expect } from 'vitest';
import {
    normalizeAngle,
    angleDifference,
    distance,
    rotateAroundPivot,
    localToWorld,
    getWorldConnectors,
    findBestSnap,
    calculateSnapTransform,
    areFacadesCompatible,
    rotateGhostAroundConnector,
} from '../snapManager';
import { computeConnectors } from '../../data/catalog/helpers';
import type { PartDefinition, TrackEdge, TrackNode } from '../../types';

// ===========================
// Mock Parts
// ===========================

const straightPart: PartDefinition = {
    id: 'test-straight',
    name: 'Straight 100mm',
    brand: 'kato',
    scale: 'n-scale',
    geometry: { type: 'straight', length: 100 },
    cost: 100,
};

const curvePart: PartDefinition = {
    id: 'test-curve',
    name: 'Curve R100 45°',
    brand: 'kato',
    scale: 'n-scale',
    geometry: { type: 'curve', radius: 100, angle: 45 },
    cost: 100,
};

const switchPart: PartDefinition = {
    id: 'test-switch',
    name: 'Left Turnout',
    brand: 'kato',
    scale: 'n-scale',
    geometry: {
        type: 'switch',
        mainLength: 100,
        branchLength: 80,
        branchAngle: 15,
        branchDirection: 'left',
    },
    cost: 1500,
};

// ===========================
// Geometry Utility Tests
// ===========================

describe('Geometry Utilities', () => {
    describe('normalizeAngle', () => {
        it('normalizes positive angles', () => {
            expect(normalizeAngle(0)).toBe(0);
            expect(normalizeAngle(90)).toBe(90);
            expect(normalizeAngle(360)).toBe(0);
            expect(normalizeAngle(450)).toBe(90);
        });

        it('normalizes negative angles', () => {
            expect(normalizeAngle(-90)).toBe(270);
            expect(normalizeAngle(-180)).toBe(180);
            expect(normalizeAngle(-360)).toBe(0);
        });
    });

    describe('angleDifference', () => {
        it('calculates smallest difference', () => {
            expect(angleDifference(0, 90)).toBe(90);
            expect(angleDifference(0, 180)).toBe(180);
            expect(angleDifference(0, 270)).toBe(90);
            expect(angleDifference(350, 10)).toBe(20);
        });
    });

    describe('distance', () => {
        it('calculates euclidean distance', () => {
            expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
            expect(distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
        });
    });

    describe('rotateAroundPivot', () => {
        it('rotates point around pivot', () => {
            const result = rotateAroundPivot({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
            expect(result.x).toBeCloseTo(0);
            expect(result.y).toBeCloseTo(10);
        });

        it('handles non-origin pivot', () => {
            const result = rotateAroundPivot({ x: 10, y: 5 }, { x: 5, y: 5 }, 180);
            expect(result.x).toBeCloseTo(0);
            expect(result.y).toBeCloseTo(5);
        });
    });

    describe('localToWorld', () => {
        it('transforms local to world with no rotation', () => {
            const result = localToWorld({ x: 10, y: 0 }, { x: 100, y: 50 }, 0);
            expect(result.x).toBeCloseTo(110);
            expect(result.y).toBeCloseTo(50);
        });

        it('transforms local to world with 90° rotation', () => {
            const result = localToWorld({ x: 10, y: 0 }, { x: 100, y: 50 }, 90);
            expect(result.x).toBeCloseTo(100);
            expect(result.y).toBeCloseTo(60);
        });
    });
});

// ===========================
// Connector Computation Tests
// ===========================

describe('computeConnectors', () => {
    it('computes straight track connectors', () => {
        const connectors = computeConnectors(straightPart);

        expect(connectors.nodes).toHaveLength(2);
        expect(connectors.primaryNodeId).toBe('A');

        const nodeA = connectors.nodes.find(n => n.localId === 'A')!;
        const nodeB = connectors.nodes.find(n => n.localId === 'B')!;

        // Node A at origin, facing back (180°)
        expect(nodeA.localPosition.x).toBe(0);
        expect(nodeA.localPosition.y).toBe(0);
        expect(nodeA.localFacade).toBe(180);

        // Node B at end, facing forward (0°)
        expect(nodeB.localPosition.x).toBe(100);
        expect(nodeB.localPosition.y).toBe(0);
        expect(nodeB.localFacade).toBe(0);
    });

    it('computes curve track connectors', () => {
        const connectors = computeConnectors(curvePart);

        expect(connectors.nodes).toHaveLength(2);

        const nodeA = connectors.nodes.find(n => n.localId === 'A')!;
        const nodeB = connectors.nodes.find(n => n.localId === 'B')!;

        expect(nodeA.localFacade).toBe(180);
        expect(nodeB.localFacade).toBe(45);  // Curve angle
    });

    it('computes switch track connectors', () => {
        const connectors = computeConnectors(switchPart);

        expect(connectors.nodes).toHaveLength(3);
        expect(connectors.primaryNodeId).toBe('entry');

        const entry = connectors.nodes.find(n => n.localId === 'entry')!;
        const main = connectors.nodes.find(n => n.localId === 'main')!;
        const branch = connectors.nodes.find(n => n.localId === 'branch')!;

        expect(entry.localFacade).toBe(180);
        expect(main.localFacade).toBe(0);
        expect(branch.localFacade).toBe(345);  // normalizeAngle(-15) = 345
    });
});

// ===========================
// World Connector Tests
// ===========================

describe('getWorldConnectors', () => {
    it('transforms connectors to world space', () => {
        const world = getWorldConnectors(straightPart, { x: 200, y: 100 }, 0);

        expect(world).toHaveLength(2);

        const worldA = world.find(c => c.localId === 'A')!;
        const worldB = world.find(c => c.localId === 'B')!;

        expect(worldA.worldPosition.x).toBeCloseTo(200);
        expect(worldA.worldPosition.y).toBeCloseTo(100);
        expect(worldA.worldFacade).toBe(180);

        expect(worldB.worldPosition.x).toBeCloseTo(300);
        expect(worldB.worldPosition.y).toBeCloseTo(100);
        expect(worldB.worldFacade).toBe(0);
    });

    it('applies rotation to world connectors', () => {
        const world = getWorldConnectors(straightPart, { x: 200, y: 100 }, 90);

        const worldA = world.find(c => c.localId === 'A')!;
        const worldB = world.find(c => c.localId === 'B')!;

        // With 90° rotation, B should be below A
        expect(worldA.worldPosition.x).toBeCloseTo(200);
        expect(worldA.worldPosition.y).toBeCloseTo(100);
        expect(worldA.worldFacade).toBe(270);  // 180 + 90

        expect(worldB.worldPosition.x).toBeCloseTo(200);
        expect(worldB.worldPosition.y).toBeCloseTo(200);  // 100 + 100 (length)
        expect(worldB.worldFacade).toBe(90);  // 0 + 90
    });
});

// ===========================
// Facade Compatibility Tests
// ===========================

describe('areFacadesCompatible', () => {
    it('accepts exactly opposite facades', () => {
        expect(areFacadesCompatible(0, 180, 15)).toBe(true);
        expect(areFacadesCompatible(90, 270, 15)).toBe(true);
    });

    it('accepts facades within tolerance', () => {
        expect(areFacadesCompatible(0, 170, 15)).toBe(true);  // 170° diff = 10° from 180°
        expect(areFacadesCompatible(0, 190, 15)).toBe(true);
    });

    it('rejects facades outside tolerance', () => {
        expect(areFacadesCompatible(0, 150, 15)).toBe(false);  // 150° diff = 30° from 180°
        expect(areFacadesCompatible(0, 0, 15)).toBe(false);    // Same direction
    });
});

// ===========================
// Snap Transform Tests
// ===========================

describe('calculateSnapTransform', () => {
    it('calculates transform for straight track connector A', () => {
        // Target at (200, 0) facing east (0°)
        // To connect via A, ghost must face west (180°)
        const target: TrackNode = {
            id: 'target-1',
            position: { x: 200, y: 0 },
            rotation: 0,  // East
            connections: ['edge-1'],
            type: 'endpoint',
        };

        const transform = calculateSnapTransform(straightPart, 'A', target);

        // Ghost rotation should make A face west (180° opposite of target's 0°)
        // If A's local facade is 180°, and we want world facade 180°,
        // then part rotation = 180 - 180 = 0°
        expect(transform.rotation).toBeCloseTo(0);

        // Ghost position should place A at target
        expect(transform.position.x).toBeCloseTo(200);
        expect(transform.position.y).toBeCloseTo(0);
    });

    it('calculates transform for straight track connector B', () => {
        // Target at (200, 0) facing east (0°)
        // To connect via B, B must face west (180°)
        const target: TrackNode = {
            id: 'target-1',
            position: { x: 200, y: 0 },
            rotation: 0,  // East
            connections: ['edge-1'],
            type: 'endpoint',
        };

        const transform = calculateSnapTransform(straightPart, 'B', target);

        // B's local facade is 0°, we want world facade 180°
        // Part rotation = 180 - 0 = 180°
        expect(transform.rotation).toBeCloseTo(180);

        // With 180° rotation, B should be at target
        // Origin (A) is 100 units in opposite direction
        expect(transform.position.x).toBeCloseTo(300);  // 200 + 100 (because rotated 180)
        expect(transform.position.y).toBeCloseTo(0);
    });
});

// ===========================
// Find Best Snap Tests  
// ===========================

describe('findBestSnap', () => {
    const targetEast: TrackNode = {
        id: 'target-east',
        position: { x: 200, y: 0 },
        rotation: 0,  // Facing east
        connections: ['edge-1'],
        type: 'endpoint',
    };

    const targetWest: TrackNode = {
        id: 'target-west',
        position: { x: 0, y: 0 },
        rotation: 180,  // Facing west
        connections: ['edge-1'],
        type: 'endpoint',
    };

    it('finds snap when ghost A is near target', () => {
        // Ghost at (195, 0), facing east (0°)
        // Target at (200, 0), facing east (0°)
        // A's world facade = 180° (opposite), should match target
        const result = findBestSnap(
            straightPart,
            { x: 195, y: 0 },  // Near target
            0,  // Ghost rotation
            [targetEast],
            'n-scale'
        );

        expect(result).not.toBeNull();
        expect(result!.ghostConnectorId).toBe('A');
        expect(result!.targetNodeId).toBe('target-east');
    });

    it('finds snap when ghost B is near target', () => {
        // Ghost origin at (-5, 0), so B is at (95, 0)
        // Target at (0, 0), facing west (180°)
        // B's world facade = 0° (opposite of 180°), should match
        const result = findBestSnap(
            straightPart,
            { x: -95, y: 0 },  // Origin so B is near targetWest
            0,
            [targetWest],
            'n-scale'
        );

        expect(result).not.toBeNull();
        expect(result!.ghostConnectorId).toBe('B');
    });

    it('returns null when no targets in range', () => {
        const result = findBestSnap(
            straightPart,
            { x: 500, y: 500 },  // Far from any target
            0,
            [targetEast],
            'n-scale'
        );

        expect(result).toBeNull();
    });

    it('auto-rotates to mate when the ghost faces the wrong way', () => {
        // Ghost rotated 180° at the target: A would face the same way as the
        // target. Snapping still succeeds by rotating the part to mate.
        const result = findBestSnap(
            straightPart,
            { x: 200, y: 0 },
            180,
            [targetEast],
            'n-scale'
        );

        expect(result).not.toBeNull();
        expect(result!.targetNodeId).toBe('target-east');
        const placed = getWorldConnectors(straightPart, result!.ghostTransform.position, result!.ghostTransform.rotation);
        const mated = placed.find(c => c.localId === result!.ghostConnectorId)!;
        expect(mated.worldPosition.x).toBeCloseTo(200);
        expect(angleDifference(mated.worldFacade, targetEast.rotation)).toBeCloseTo(180);
        // The placed straight continues east, not back over the track
        expect(Math.max(...placed.map(c => c.worldPosition.x))).toBeGreaterThan(200);
    });
});

describe('findBestSnap — chaining curves', () => {
    // End of a previous 45° curve: facing 45° (south-east on screen)
    const curveEnd: TrackNode = {
        id: 'curve-end',
        position: { x: 0, y: 0 },
        rotation: 45,
        connections: ['edge-1'],
        type: 'endpoint',
    };
    const forward = { x: Math.cos(Math.PI / 4), y: Math.sin(Math.PI / 4) };
    const left = { x: forward.y, y: -forward.x };   // 90° anticlockwise on screen

    const snapAt = (offset: { x: number; y: number }) => {
        const result = findBestSnap(curvePart, offset, 0, [curveEnd], 'n-scale')!;
        const placed = getWorldConnectors(curvePart, result.ghostTransform.position, result.ghostTransform.rotation);
        const far = placed.find(c => Math.hypot(c.worldPosition.x, c.worldPosition.y) > 1)!;
        return { result, far };
    };

    it('snaps a curve onto a curve end without manual rotation', () => {
        const { result } = snapAt({ x: 2, y: 2 });
        expect(result.targetNodeId).toBe('curve-end');
    });

    it('continues forward from the endpoint', () => {
        const { far } = snapAt({ x: forward.x * 10, y: forward.y * 10 });
        expect(far.worldPosition.x * forward.x + far.worldPosition.y * forward.y).toBeGreaterThan(0);
    });

    it('turns toward the side the cursor is on', () => {
        const sideOf = (p: { x: number; y: number }) => p.x * left.x + p.y * left.y;
        const towardLeft = snapAt({ x: forward.x * 8 + left.x * 12, y: forward.y * 8 + left.y * 12 });
        const towardRight = snapAt({ x: forward.x * 8 - left.x * 12, y: forward.y * 8 - left.y * 12 });
        expect(sideOf(towardLeft.far.worldPosition)).toBeGreaterThan(0);
        expect(sideOf(towardRight.far.worldPosition)).toBeLessThan(0);
    });

    it('with the cursor straight ahead, keeps turning the way the track it joins turns', () => {
        const sideOf = (p: { x: number; y: number }) => p.x * left.x + p.y * left.y;
        // The piece ending at curve-end, turning right (increasing angles) or left into it
        const arcInto = (startAngle: number, endAngle: number): Record<string, TrackEdge> => ({
            'edge-1': {
                id: 'edge-1', partId: 'test-curve', startNodeId: 'before', endNodeId: 'curve-end', length: 247,
                geometry: { type: 'arc', center: { x: 0, y: 0 }, radius: 315, startAngle, endAngle },
            },
        });
        const ahead = { x: forward.x * 8, y: forward.y * 8 };
        const far = (edges: Record<string, TrackEdge>) => {
            const result = findBestSnap(curvePart, ahead, 0, [curveEnd], 'n-scale', edges)!;
            const placed = getWorldConnectors(curvePart, result.ghostTransform.position, result.ghostTransform.rotation);
            return placed.find(c => Math.hypot(c.worldPosition.x, c.worldPosition.y) > 1)!.worldPosition;
        };
        expect(sideOf(far(arcInto(-90, -45)))).toBeLessThan(0);   // right turn continues right
        expect(sideOf(far(arcInto(180, 135)))).toBeGreaterThan(0); // left turn continues left
    });
});

// ===========================
// Rotate Around Connector Tests
// ===========================

describe('rotateGhostAroundConnector', () => {
    it('keeps connector A fixed when rotating', () => {
        // Ghost at (100, 50), rotation 0°
        // Connector A is at (100, 50) in world space
        // Rotate 90° around A should keep A fixed
        const result = rotateGhostAroundConnector(
            { x: 100, y: 50 },
            0,
            straightPart,
            'A',
            90
        );

        expect(result.rotation).toBe(90);

        // A should still be at (100, 50)
        // With new rotation, origin has moved
        const worldConnectors = getWorldConnectors(
            straightPart,
            result.position,
            result.rotation
        );
        const worldA = worldConnectors.find(c => c.localId === 'A')!;

        expect(worldA.worldPosition.x).toBeCloseTo(100);
        expect(worldA.worldPosition.y).toBeCloseTo(50);
    });

    it('keeps connector B fixed when rotating', () => {
        // Ghost at (100, 50), rotation 0° → B at (200, 50)
        // Rotate 90° around B
        const result = rotateGhostAroundConnector(
            { x: 100, y: 50 },
            0,
            straightPart,
            'B',
            90
        );

        expect(result.rotation).toBe(90);

        // B should still be at (200, 50)
        const worldConnectors = getWorldConnectors(
            straightPart,
            result.position,
            result.rotation
        );
        const worldB = worldConnectors.find(c => c.localId === 'B')!;

        expect(worldB.worldPosition.x).toBeCloseTo(200);
        expect(worldB.worldPosition.y).toBeCloseTo(50);
    });
});
