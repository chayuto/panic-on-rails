import { describe, it, expect } from 'vitest';
import {
    distance,
    distanceSquared,
    vectorAngle,
    vectorFromAngle,
    vectorAdd,
    vectorSubtract,
    vectorScale,
} from '../vector';

// ===========================
// Distance Tests
// ===========================

describe('distance', () => {
    it('should calculate distance for 3-4-5 triangle', () => {
        expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });

    it('should return 0 for same point', () => {
        expect(distance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
        expect(distance({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(0);
    });

    it('should calculate horizontal distance', () => {
        expect(distance({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(10);
    });

    it('should calculate vertical distance', () => {
        expect(distance({ x: 0, y: 0 }, { x: 0, y: 10 })).toBe(10);
    });

    it('should calculate diagonal distance', () => {
        expect(distance({ x: 1, y: 1 }, { x: 4, y: 5 })).toBe(5);
    });
});

describe('distanceSquared', () => {
    it('should calculate squared distance for 3-4-5 triangle', () => {
        expect(distanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
    });

    it('should return 0 for same point', () => {
        expect(distanceSquared({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
    });

    it('should calculate horizontal squared distance', () => {
        expect(distanceSquared({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(100);
    });
});

// ===========================
// Vector Angle Tests
// ===========================

describe('vectorAngle', () => {
    it('should return angle for cardinal directions', () => {
        expect(vectorAngle({ x: 1, y: 0 })).toBe(0);
        expect(vectorAngle({ x: 0, y: 1 })).toBe(90);
        expect(vectorAngle({ x: -1, y: 0 })).toBe(180);
        expect(vectorAngle({ x: 0, y: -1 })).toBe(270);
    });

    it('should return angle for diagonal directions', () => {
        expect(vectorAngle({ x: 1, y: 1 })).toBeCloseTo(45);
        expect(vectorAngle({ x: -1, y: 1 })).toBeCloseTo(135);
        expect(vectorAngle({ x: -1, y: -1 })).toBeCloseTo(225);
        expect(vectorAngle({ x: 1, y: -1 })).toBeCloseTo(315);
    });
});

describe('vectorFromAngle', () => {
    it('should create unit vector for cardinal directions', () => {
        const v0 = vectorFromAngle(0);
        expect(v0.x).toBeCloseTo(1);
        expect(v0.y).toBeCloseTo(0);

        const v90 = vectorFromAngle(90);
        expect(v90.x).toBeCloseTo(0);
        expect(v90.y).toBeCloseTo(1);

        const v180 = vectorFromAngle(180);
        expect(v180.x).toBeCloseTo(-1);
        expect(v180.y).toBeCloseTo(0);

        const v270 = vectorFromAngle(270);
        expect(v270.x).toBeCloseTo(0);
        expect(v270.y).toBeCloseTo(-1);
    });

    it('should create unit vector for 45 degrees', () => {
        const v = vectorFromAngle(45);
        const expected = Math.SQRT1_2;
        expect(v.x).toBeCloseTo(expected);
        expect(v.y).toBeCloseTo(expected);
    });
});

// ===========================
// Vector Arithmetic Tests
// ===========================

describe('vectorAdd', () => {
    it('should add vectors', () => {
        const result = vectorAdd({ x: 1, y: 2 }, { x: 3, y: 4 });
        expect(result.x).toBe(4);
        expect(result.y).toBe(6);
    });

    it('should handle zero vectors', () => {
        const result = vectorAdd({ x: 5, y: 10 }, { x: 0, y: 0 });
        expect(result.x).toBe(5);
        expect(result.y).toBe(10);
    });

    it('should handle negative values', () => {
        const result = vectorAdd({ x: 5, y: 5 }, { x: -3, y: -2 });
        expect(result.x).toBe(2);
        expect(result.y).toBe(3);
    });
});

describe('vectorSubtract', () => {
    it('should subtract vectors', () => {
        const result = vectorSubtract({ x: 5, y: 7 }, { x: 2, y: 3 });
        expect(result.x).toBe(3);
        expect(result.y).toBe(4);
    });

    it('should handle same vectors', () => {
        const result = vectorSubtract({ x: 5, y: 5 }, { x: 5, y: 5 });
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
    });
});

describe('vectorScale', () => {
    it('should scale vector by positive scalar', () => {
        const result = vectorScale({ x: 2, y: 3 }, 2);
        expect(result.x).toBe(4);
        expect(result.y).toBe(6);
    });

    it('should scale vector by zero', () => {
        const result = vectorScale({ x: 5, y: 10 }, 0);
        expect(result.x).toBe(0);
        expect(result.y).toBe(0);
    });

    it('should scale vector by negative scalar', () => {
        const result = vectorScale({ x: 2, y: 3 }, -1);
        expect(result.x).toBe(-2);
        expect(result.y).toBe(-3);
    });

    it('should scale vector by fractional scalar', () => {
        const result = vectorScale({ x: 10, y: 20 }, 0.5);
        expect(result.x).toBe(5);
        expect(result.y).toBe(10);
    });
});

import { vectorRotate } from '../vector';

describe('vectorRotate', () => {
    it('should rotate vector by 0 degrees', () => {
        const v = { x: 10, y: 5 };
        const result = vectorRotate(v, 0);
        expect(result.x).toBeCloseTo(10);
        expect(result.y).toBeCloseTo(5);
    });

    it('should rotate vector by 90 degrees', () => {
        const v = { x: 1, y: 0 };
        const result = vectorRotate(v, 90);
        expect(result.x).toBeCloseTo(0);
        expect(result.y).toBeCloseTo(1);
    });

    it('should rotate vector by 180 degrees', () => {
        const v = { x: 1, y: 0 };
        const result = vectorRotate(v, 180);
        expect(result.x).toBeCloseTo(-1);
        expect(result.y).toBeCloseTo(0);
    });

    it('should rotate vector by 270 degrees', () => {
        const v = { x: 1, y: 0 };
        const result = vectorRotate(v, 270);
        expect(result.x).toBeCloseTo(0);
        expect(result.y).toBeCloseTo(-1);
    });

    it('should rotate vector by 45 degrees', () => {
        const v = { x: 1, y: 0 };
        const result = vectorRotate(v, 45);
        expect(result.x).toBeCloseTo(Math.SQRT1_2);
        expect(result.y).toBeCloseTo(Math.SQRT1_2);
    });
});
