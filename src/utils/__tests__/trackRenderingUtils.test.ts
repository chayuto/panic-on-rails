import { describe, it, expect } from 'vitest';
import { generateStraightSleepers, generateArcSleepers, getParallelLinePoints, getDualArcRadii } from '../trackRenderingUtils';

describe('trackRenderingUtils', () => {
  describe('generateStraightSleepers', () => {
    it('generates sleepers for horizontal line', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 0 };
      const spacing = 20;
      const sleepers = generateStraightSleepers(start, end, spacing);

      expect(sleepers.length).toBe(6); // 0, 20, 40, 60, 80, 100
      expect(sleepers[0]).toEqual({ x: 0, y: 0, rotation: 90 });
      expect(sleepers[5]).toEqual({ x: 100, y: 0, rotation: 90 });
    });

    it('generates sleepers for vertical line', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 0, y: 100 };
      const spacing = 25;
      const sleepers = generateStraightSleepers(start, end, spacing);

      expect(sleepers.length).toBe(5); // 0, 25, 50, 75, 100
      expect(sleepers[0].x).toBeCloseTo(0);
      expect(sleepers[0].y).toBeCloseTo(0);
      expect(sleepers[0].rotation).toBe(180); // atan2(1, 0) is 90 deg. + 90 = 180.
    });
  });

  describe('generateArcSleepers', () => {
    it('generates sleepers for 90 degree arc', () => {
      const center = { x: 0, y: 0 };
      const radius = 100;
      const startAngle = 0;
      const endAngle = 90;
      const spacing = 20; // Arc length is ~157.08

      const sleepers = generateArcSleepers(center, radius, startAngle, endAngle, spacing);

      // Arc length = 157.08. Count = floor(7.85) = 7. Loop 0 to 7 -> 8 sleepers.
      expect(sleepers.length).toBeGreaterThan(0);

      // First sleeper at start angle 0
      expect(sleepers[0].x).toBeCloseTo(100);
      expect(sleepers[0].y).toBeCloseTo(0);
      expect(sleepers[0].rotation).toBe(90); // 0 + 90

      // Last sleeper at end angle 90
      const last = sleepers[sleepers.length - 1];
      expect(last.x).toBeCloseTo(0);
      expect(last.y).toBeCloseTo(100);
      expect(last.rotation).toBe(180); // 90 + 90
    });
  });

  describe('getParallelLinePoints', () => {
    it('calculates parallel lines correctly', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 0 };
      const offset = 10;
      // direction is (1, 0). perp is (0, 1).
      // perpX = -0 = 0. perpY = 1.
      // start: 0+0, 0+10. end: 100+0, 0+10.

      const points = getParallelLinePoints(start, end, offset);
      expect(points).toEqual([0, 10, 100, 10]);
    });
  });

  describe('getDualArcRadii', () => {
    it('calculates radii correctly', () => {
      const radii = getDualArcRadii(100, 8);
      expect(radii).toEqual({ inner: 96, outer: 104 });
    });
  });
});
