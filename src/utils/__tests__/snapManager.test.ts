import { describe, it, expect } from 'vitest';
import { findBestSnapForTrack } from '../snapManager';
import type { TrackNode, PartDefinition } from '../../types';

// Mocks
const straightPart: PartDefinition = {
    id: 'test-straight',
    name: 'Straight',
    brand: 'kato',
    scale: 'n-scale',
    geometry: { type: 'straight', length: 100 },
    cost: 100
};

const curvePart: PartDefinition = {
    id: 'test-curve',
    name: 'Curve',
    brand: 'kato',
    scale: 'n-scale',
    geometry: { type: 'curve', radius: 100, angle: 90 }, // 90 deg curve
    cost: 100
};

// Target Endpoint at (200, 0), facing East (0 deg)
// This means the track ends at 200, going East.
// To connect, we must face West (180 deg).
const targetNode: TrackNode = {
    id: 'target-1',
    position: { x: 200, y: 0 },
    rotation: 0,
    connections: ['edge-1'],
    type: 'endpoint'
};

const openEndpoints = [targetNode];

describe('findBestSnapForTrack', () => {
    it('snaps Start Node to Target (Head-to-Head)', () => {
        // Ghost start is at (205, 0) - close to target at (200, 0)
        const ghostPos = { x: 205, y: 0 };
        // User rotates ghost to face East (0) to match target direction
        const ghostRot = 0;

        const result = findBestSnapForTrack(ghostPos, ghostRot, straightPart, openEndpoints, 'n-scale');

        expect(result).toBeDefined();
        if (!result) return;

        expect(result.snap.targetNodeId).toBe('target-1');
        expect(result.snap.distance).toBe(5);

        // Check Ghost Transform
        // Track goes SAME direction as target faces (0° east)
        // Our START faces opposite (180° west), creating proper head-to-head mating
        expect(result.ghostPosition.x).toBeCloseTo(200);
        expect(result.ghostPosition.y).toBeCloseTo(0);
        expect(result.ghostRotation).toBe(0); // Track goes 0° (same as target faces)
    });

    it('snaps End Node to Target (Tail-to-Head - Straight)', () => {
        // With new tangent-matching formula:
        // Target faces 0° (east)
        // targetTangent = 0 + 180 = 180°
        // endSnapRotation = 180 - 0 + 180 = 0° (track goes east)
        // END at (200, 0), track goes 0° (east), so START at (100, 0)

        const ghostPos = { x: 105, y: 0 };
        const ghostRot = 0;

        const result = findBestSnapForTrack(ghostPos, ghostRot, straightPart, openEndpoints, 'n-scale');

        expect(result).toBeDefined();
        if (!result) return;

        expect(result.snap.targetNodeId).toBe('target-1');
        expect(result.snap.distance).toBe(5);

        // Ghost starts at (100, 0), goes east, ends at (200, 0)
        expect(result.ghostPosition.x).toBeCloseTo(100);
        expect(result.ghostPosition.y).toBeCloseTo(0);
        expect(result.ghostRotation).toBe(0);
    });

    it('snaps End Node to Target (Tail-to-Head - Curve)', () => {
        // With new tangent-matching formula:
        // Target faces 0° (east)
        // targetTangent = 0 + 180 = 180°
        // endSnapRotation = 180 - 90 + 180 = 270° (track goes south)
        //
        // For rotation 270° (going south) with R=100, angle=90°:
        // Center is 90° CCW from direction: centerAngle = 270 - 90 = 180°
        // Center = Start + (R * cos(180), R * sin(180)) = Start + (-100, 0)
        // Arc sweeps 90° CCW
        // End position relative to center at arcEndAngle = 180 + 180 + 90 = 450 = 90°
        // End = Center + (R * cos(90), R * sin(90)) = Center + (0, 100)
        //
        // If End at (200, 0):
        // Center.x = 200, Center.y = -100
        // Start.x = Center.x + 100 = 300, Start.y = Center.y = -100
        // Actually let me compute differently:
        // End = (200, 0), need to find Start
        // For rotation 270°, centerAngle = 180°, so center is to the LEFT (-x) of start
        // Arc ends at: center + (cos(90°)*R, sin(90°)*R) = center + (0, 100)
        // So center = end - (0, 100) = (200, -100)
        // Start = center + (cos(360°)*R, sin(360°)*R) = center + (100, 0) = (300, -100)

        const ghostPos = { x: 300, y: -95 };
        const ghostRot = 270;

        const result = findBestSnapForTrack(ghostPos, ghostRot, curvePart, openEndpoints, 'n-scale');

        expect(result).toBeDefined();
        if (!result) return;

        expect(result.snap.targetNodeId).toBe('target-1');

        // Rotation should be 270°
        expect(result.ghostRotation).toBe(270);

        // Start Position should be (300, -100)
        expect(result.ghostPosition.x).toBeCloseTo(300);
        expect(result.ghostPosition.y).toBeCloseTo(-100);
    });
});
