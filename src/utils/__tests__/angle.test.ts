import { describe, it, expect } from 'vitest';
import {
    normalizeAngle,
    angleDifference,
    degreesToRadians,
    radiansToDegrees,
} from '../angle';

// ===========================
// Angle Normalization Tests
// ===========================

describe('normalizeAngle', () => {
    it('should normalize angles already in range', () => {
        expect(normalizeAngle(0)).toBe(0);
        expect(normalizeAngle(90)).toBe(90);
        expect(normalizeAngle(180)).toBe(180);
        expect(normalizeAngle(270)).toBe(270);
        expect(normalizeAngle(359)).toBe(359);
    });

    it('should normalize angles >= 360', () => {
        expect(normalizeAngle(360)).toBe(0);
        expect(normalizeAngle(450)).toBe(90);
        expect(normalizeAngle(720)).toBe(0);
        expect(normalizeAngle(810)).toBe(90);
    });

    it('should normalize negative angles', () => {
        expect(normalizeAngle(-90)).toBe(270);
        expect(normalizeAngle(-180)).toBe(180);
        expect(normalizeAngle(-270)).toBe(90);
        expect(normalizeAngle(-360)).toBe(0);
        expect(normalizeAngle(-450)).toBe(270);
    });

    it('should handle small negative angles', () => {
        expect(normalizeAngle(-1)).toBe(359);
        expect(normalizeAngle(-0.5)).toBeCloseTo(359.5);
    });

    it('should handle very large angles', () => {
        expect(normalizeAngle(3600)).toBe(0);
        expect(normalizeAngle(3645)).toBe(45);
    });
});

// ===========================
// Angle Difference Tests
// ===========================

describe('angleDifference', () => {
    it('should return smallest difference for simple cases', () => {
        expect(angleDifference(0, 90)).toBe(90);
        expect(angleDifference(0, 180)).toBe(180);
        expect(angleDifference(0, 270)).toBe(90);
    });

    it('should return smallest difference wrapping around 360', () => {
        expect(angleDifference(10, 350)).toBe(20);
        expect(angleDifference(350, 10)).toBe(20);
        expect(angleDifference(1, 359)).toBe(2);
    });

    it('should handle same angles', () => {
        expect(angleDifference(45, 45)).toBe(0);
        expect(angleDifference(0, 360)).toBe(0);
        expect(angleDifference(90, 450)).toBe(0);
    });

    it('should handle opposite angles', () => {
        expect(angleDifference(0, 180)).toBe(180);
        expect(angleDifference(45, 225)).toBe(180);
        expect(angleDifference(90, 270)).toBe(180);
    });

    it('should handle negative input angles', () => {
        expect(angleDifference(-90, 0)).toBe(90);
        expect(angleDifference(-180, 0)).toBe(180);
    });
});

// ===========================
// Degree/Radian Conversion Tests
// ===========================

describe('degreesToRadians', () => {
    it('should convert cardinal angles', () => {
        expect(degreesToRadians(0)).toBe(0);
        expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
        expect(degreesToRadians(180)).toBeCloseTo(Math.PI);
        expect(degreesToRadians(270)).toBeCloseTo((3 * Math.PI) / 2);
        expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI);
    });

    it('should convert common angles', () => {
        expect(degreesToRadians(45)).toBeCloseTo(Math.PI / 4);
        expect(degreesToRadians(60)).toBeCloseTo(Math.PI / 3);
    });
});

describe('radiansToDegrees', () => {
    it('should convert cardinal angles', () => {
        expect(radiansToDegrees(0)).toBe(0);
        expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90);
        expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
        expect(radiansToDegrees((3 * Math.PI) / 2)).toBeCloseTo(270);
        expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360);
    });

    it('should convert common angles', () => {
        expect(radiansToDegrees(Math.PI / 4)).toBeCloseTo(45);
        expect(radiansToDegrees(Math.PI / 3)).toBeCloseTo(60);
    });
});
