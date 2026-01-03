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
        // Ghost start is at (205, 0) - close to (200, 0)
        const ghostPos = { x: 205, y: 0 };
        // User rotates ghost to face West (180) to match
        const ghostRot = 180;

        const result = findBestSnapForTrack(ghostPos, ghostRot, straightPart, openEndpoints, 'n-scale');

        expect(result).toBeDefined();
        if (!result) return;

        expect(result.snap.targetNodeId).toBe('target-1');
        expect(result.snap.distance).toBe(5);

        // Check Ghost Transform
        // Should align exactly to target
        expect(result.ghostPosition.x).toBeCloseTo(200);
        expect(result.ghostPosition.y).toBeCloseTo(0);
        expect(result.ghostRotation).toBe(180); // Target(0) + 180
    });

    it('snaps End Node to Target (Tail-to-Head - Straight)', () => {
        // We want the END of the ghost to be at (200, 0).
        // Ghost is 100 long.
        // So Start should be at (300, 0) if facing West (180).

        // Place ghost start at (305, 0).
        const ghostPos = { x: 305, y: 0 };
        const ghostRot = 180;

        const result = findBestSnapForTrack(ghostPos, ghostRot, straightPart, openEndpoints, 'n-scale');

        expect(result).toBeDefined();
        if (!result) return;

        expect(result.snap.targetNodeId).toBe('target-1');
        // Distance should be from End(205) to Target(200) = 5
        expect(result.snap.distance).toBe(5);

        // Check Ghost Transform
        // New End should be at Target(200, 0).
        // New Rotation should be Target(0) + 180 = 180.
        // New Start should be at 200 - vector(100, 180deg)
        // cos(180) = -1. 200 - (-100) = 300.
        expect(result.ghostPosition.x).toBeCloseTo(300);
        expect(result.ghostPosition.y).toBeCloseTo(0);
        expect(result.ghostRotation).toBe(180);
    });

    it('snaps End Node to Target (Tail-to-Head - Curve)', () => {
        // Curve: R=100, Angle=90.
        // We want End of Curve to snap to (200, 0) facing West (180).

        // If Snap Rotation is 180.
        // Curve adds 90 degrees.
        // So Start Rotation + 90 = 180.
        // Start Rotation should be 90 (Facing South).

        // Let's configure ghost:
        // User holds ghost at rough start position.
        // Rotated roughly 90 deg.

        // Where is Start if End is at (200,0) and EndRot is 180?
        // Center calculation:
        // StartRot = 90.
        // CenterAngle = 90 - 90 = 0.
        // Center = Start + (R, 0) = (Start.x + 100, Start.y).
        // EndAngle = 0 + 180 + 90 = 270 (-90).
        // EndPos = Center + (0, -R) = (Start.x + 100, Start.y - 100).

        // We want EndPos = (200, 0).
        // Start.x + 100 = 200 => Start.x = 100.
        // Start.y - 100 = 0 => Start.y = 100.
        // So ideal Start is (100, 100).

        // Let's place mouse at (105, 100) - 5px error.
        const ghostPos = { x: 105, y: 100 };
        const ghostRot = 90;

        const result = findBestSnapForTrack(ghostPos, ghostRot, curvePart, openEndpoints, 'n-scale');

        expect(result).toBeDefined();
        if (!result) return;

        expect(result.snap.targetNodeId).toBe('target-1');

        // Check alignment
        // End Rotation Target = 180.
        // Start Rotation = 180 - 90 = 90.
        expect(result.ghostRotation).toBe(90);

        // Start Position should be (100, 100)
        expect(result.ghostPosition.x).toBeCloseTo(100);
        expect(result.ghostPosition.y).toBeCloseTo(100);
    });
});
