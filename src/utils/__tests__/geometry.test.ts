import { describe, it, expect } from 'vitest';
import {
    normalizeAngle,
    angleDifference,
    distance,
    distanceSquared,
    localToWorld,
    rotateAroundPivot,
    degreesToRadians,
    radiansToDegrees,
    vectorAngle,
    vectorFromAngle,
    vectorAdd,
    vectorSubtract,
    vectorScale,
} from '../geometry';

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
