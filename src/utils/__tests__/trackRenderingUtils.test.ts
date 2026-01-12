import { describe, it, expect } from 'vitest';
import {
    getParallelLinePoints,
    getDualArcRadii,
    generateStraightSleepers,
    generateArcSleepers,
    RAIL,
    SLEEPER,
} from '../trackRenderingUtils';

describe('trackRenderingUtils', () => {
    describe('getParallelLinePoints', () => {
        it('should calculate parallel line points for horizontal line', () => {
            // Horizontal line from (0,0) to (10,0)
            // Perpendicular is (0,1)
            // Offset 2 should shift y by 2
            const [x1, y1, x2, y2] = getParallelLinePoints({ x: 0, y: 0 }, { x: 10, y: 0 }, 2);
            expect(x1).toBeCloseTo(0);
            expect(y1).toBeCloseTo(2);
            expect(x2).toBeCloseTo(10);
            expect(y2).toBeCloseTo(2);
        });

        it('should calculate parallel line points for vertical line', () => {
            // Vertical line from (0,0) to (0,10)
            // Perpendicular is (-1,0)
            // Offset 2 should shift x by -2
            const [x1, y1, x2, y2] = getParallelLinePoints({ x: 0, y: 0 }, { x: 0, y: 10 }, 2);
            expect(x1).toBeCloseTo(-2);
            expect(y1).toBeCloseTo(0);
            expect(x2).toBeCloseTo(-2);
            expect(y2).toBeCloseTo(10);
        });

        it('should handle zero length line', () => {
            const [x1, y1, x2, y2] = getParallelLinePoints({ x: 0, y: 0 }, { x: 0, y: 0 }, 2);
            expect(x1).toBe(0);
            expect(y1).toBe(0);
            expect(x2).toBe(0);
            expect(y2).toBe(0);
        });
    });

    describe('getDualArcRadii', () => {
        it('should calculate inner and outer radii', () => {
            const centerRadius = 100;
            const gauge = 10;
            const result = getDualArcRadii(centerRadius, gauge);
            expect(result.inner).toBe(95);
            expect(result.outer).toBe(105);
        });
    });

    describe('generateStraightSleepers', () => {
        it('should generate sleepers for straight line', () => {
            // Length 40, spacing 20 -> 3 sleepers (0, 20, 40)
            const sleepers = generateStraightSleepers({ x: 0, y: 0 }, { x: 40, y: 0 }, 20);
            expect(sleepers.length).toBe(3);

            // First sleeper
            expect(sleepers[0].x).toBeCloseTo(0);
            expect(sleepers[0].y).toBeCloseTo(0);
            expect(sleepers[0].rotation).toBe(90); // Horizontal line -> vertical sleeper (90 deg)

            // Middle sleeper
            expect(sleepers[1].x).toBeCloseTo(20);
            expect(sleepers[1].y).toBeCloseTo(0);

            // Last sleeper
            expect(sleepers[2].x).toBeCloseTo(40);
            expect(sleepers[2].y).toBeCloseTo(0);
        });

        it('should handle zero length', () => {
            const sleepers = generateStraightSleepers({ x: 0, y: 0 }, { x: 0, y: 0 }, 20);
            expect(sleepers).toEqual([]);
        });
    });

    describe('generateArcSleepers', () => {
        it('should generate sleepers for arc', () => {
            // Radius 100
            // 90 degree arc length = 2 * PI * 100 / 4 ≈ 157
            // Spacing 50 -> approx 4 sleepers
            const center = { x: 0, y: 0 };
            const radius = 100;
            const startAngle = 0;
            const endAngle = 90;
            const spacing = 50;

            const sleepers = generateArcSleepers(center, radius, startAngle, endAngle, spacing);

            expect(sleepers.length).toBeGreaterThan(0);

            // Check first sleeper (at start angle 0)
            // Position should be (100, 0)
            // Rotation should be 90 (tangent is vertical, sleeper perpendicular to radius)
            // Wait, logic says "Perpendicular to radius (tangent + 90)"
            // At 0 degrees, radius vector is (1,0). Perpendicular is (0,1).
            // Rotation 90 matches visual vertical.

            // Actually, let's check the code logic:
            // rotation: angleDeg + 90
            // At 0 deg, rotation is 90. Correct.

            const first = sleepers[0];
            expect(first.x).toBeCloseTo(100);
            expect(first.y).toBeCloseTo(0);
            expect(first.rotation).toBe(90);

            // Check last sleeper (at end angle 90)
            // Position should be (0, 100)
            // Rotation should be 180
            const last = sleepers[sleepers.length - 1];
            expect(last.x).toBeCloseTo(0);
            expect(last.y).toBeCloseTo(100);
            expect(last.rotation).toBe(180);
        });

        it('should handle zero length arc', () => {
            const sleepers = generateArcSleepers({ x: 0, y: 0 }, 100, 0, 0, 20);
            expect(sleepers).toEqual([]);
        });
    });
});
