import { describe, it, expect } from 'vitest';
import { getParallelLinePoints, generateStraightSleepers, generateArcSleepers } from '../trackRenderingUtils';

describe('trackRenderingUtils', () => {
    describe('getParallelLinePoints', () => {
        it('calculates parallel points correctly', () => {
            const start = { x: 0, y: 0 };
            const end = { x: 10, y: 0 };
            const offset = 5;

            // Should be shifted up (negative Y) because perp vector for (10,0) is (0,-1)
            // Wait, let's check implementation
            // dx=10, dy=0
            // perpX = -0/10 = 0
            // perpY = 10/10 = 1
            // offset=5
            // p1 = 0 + 0*5 = 0
            // p2 = 0 + 1*5 = 5
            // p3 = 10 + 0*5 = 10
            // p4 = 0 + 1*5 = 5

            const [x1, y1, x2, y2] = getParallelLinePoints(start, end, offset);

            expect(x1).toBeCloseTo(0);
            expect(y1).toBeCloseTo(5);
            expect(x2).toBeCloseTo(10);
            expect(y2).toBeCloseTo(5);
        });

        it('handles zero length line', () => {
            const start = { x: 0, y: 0 };
            const end = { x: 0, y: 0 };
            const offset = 5;

            const [x1, y1, x2, y2] = getParallelLinePoints(start, end, offset);

            expect(x1).toBe(0);
            expect(y1).toBe(0);
            expect(x2).toBe(0);
            expect(y2).toBe(0);
        });
    });

    describe('generateStraightSleepers', () => {
        it('generates correct number of sleepers', () => {
            const start = { x: 0, y: 0 };
            const end = { x: 100, y: 0 };
            const spacing = 20;

            const sleepers = generateStraightSleepers(start, end, spacing);

            // Length 100, spacing 20 -> 5 segments -> 6 sleepers (0, 20, 40, 60, 80, 100)
            expect(sleepers.length).toBe(6);
        });

        it('sets correct rotation', () => {
            const start = { x: 0, y: 0 };
            const end = { x: 100, y: 0 };
            const spacing = 20;

            const sleepers = generateStraightSleepers(start, end, spacing);

            // Line is horizontal (0 degrees)
            // Sleepers should be perpendicular (90 degrees)
            expect(sleepers[0].rotation).toBe(90);
        });
    });

    describe('generateArcSleepers', () => {
        it('generates correct number of sleepers for arc', () => {
            const center = { x: 0, y: 0 };
            const radius = 100;
            const startAngle = 0;
            const endAngle = 90;
            const spacing = 20;

            const sleepers = generateArcSleepers(center, radius, startAngle, endAngle, spacing);

            // Arc length = 2 * PI * 100 * (90/360) = 50 * PI ≈ 157
            // 157 / 20 ≈ 7.85 -> 7 segments -> 8 sleepers
            expect(sleepers.length).toBe(8);
        });
    });
});
