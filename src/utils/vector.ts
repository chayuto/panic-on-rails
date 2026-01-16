/**
 * Vector Utilities for PanicOnRails
 *
 * Moved from geometry.ts
 */

import type { Vector2 } from '../types';
import { normalizeAngle, radiansToDegrees, degreesToRadians } from './angle';

// ===========================
// Vector Utilities
// ===========================

/**
 * Add two vectors.
 */
export function vectorAdd(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtract vector b from vector a.
 */
export function vectorSubtract(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Scale a vector by a scalar.
 */
export function vectorScale(v: Vector2, scalar: number): Vector2 {
    return { x: v.x * scalar, y: v.y * scalar };
}

/**
 * Calculate the angle of a vector from origin (in degrees).
 * Returns angle in [0, 360) range.
 */
export function vectorAngle(v: Vector2): number {
    return normalizeAngle(radiansToDegrees(Math.atan2(v.y, v.x)));
}

/**
 * Create a unit vector from an angle.
 *
 * @param angleDegrees - Angle in degrees
 * @returns Unit vector pointing in that direction
 */
export function vectorFromAngle(angleDegrees: number): Vector2 {
    const rad = degreesToRadians(angleDegrees);
    return { x: Math.cos(rad), y: Math.sin(rad) };
}

/**
 * Rotate a vector by an angle.
 *
 * @param v - Vector to rotate
 * @param angleDegrees - Angle to rotate by in degrees
 * @returns Rotated vector
 */
export function vectorRotate(v: Vector2, angleDegrees: number): Vector2 {
    const rad = degreesToRadians(angleDegrees);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        x: v.x * cos - v.y * sin,
        y: v.x * sin + v.y * cos
    };
}

// ===========================
// Distance Utilities
// ===========================

/**
 * Euclidean distance between two points.
 *
 * @param a - First point
 * @param b - Second point
 * @returns Distance in same units as input
 */
export function distance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Squared distance between two points.
 * Use when comparing distances (avoids sqrt).
 *
 * @param a - First point
 * @param b - Second point
 * @returns Squared distance
 */
export function distanceSquared(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
}
