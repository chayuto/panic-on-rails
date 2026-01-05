/**
 * Geometry Utilities for PanicOnRails
 *
 * Single source of truth for all geometric calculations.
 * All angles are in DEGREES per project constitution.
 *
 * @see docs/architecture/constitution.md
 */

import type { Vector2 } from '../types';

// ===========================
// Angle Utilities
// ===========================

/**
 * Normalize angle to [0, 360) range.
 * MANDATORY for all angle storage per constitution.
 *
 * @param angle - Angle in degrees (any value)
 * @returns Normalized angle in [0, 360)
 *
 * @example
 * normalizeAngle(-90)  // Returns 270
 * normalizeAngle(450)  // Returns 90
 */
export function normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
}

/**
 * Calculate the smallest angular difference between two angles.
 * Result is always in range [0, 180].
 *
 * @param a - First angle in degrees
 * @param b - Second angle in degrees
 * @returns Smallest difference in degrees [0, 180]
 *
 * @example
 * angleDifference(10, 350)  // Returns 20 (not 340)
 * angleDifference(0, 180)   // Returns 180
 */
export function angleDifference(a: number, b: number): number {
    const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    return diff > 180 ? 360 - diff : diff;
}

/**
 * Convert degrees to radians.
 * Use ONLY at point of trigonometric calculation per constitution.
 *
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees.
 *
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radiansToDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
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

// ===========================
// Transform Utilities
// ===========================

/**
 * Transform a local position to world coordinates.
 *
 * @param localPos - Position in local coordinates
 * @param worldOrigin - World position of the local origin
 * @param worldRotation - Rotation of local space in degrees
 * @returns Position in world coordinates
 */
export function localToWorld(
    localPos: Vector2,
    worldOrigin: Vector2,
    worldRotation: number
): Vector2 {
    const rad = degreesToRadians(worldRotation);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
        x: worldOrigin.x + localPos.x * cos - localPos.y * sin,
        y: worldOrigin.y + localPos.x * sin + localPos.y * cos,
    };
}

/**
 * Rotate a point around a pivot point.
 *
 * @param point - Point to rotate
 * @param pivot - Center of rotation
 * @param angleDegrees - Rotation angle in degrees
 * @returns Rotated point
 */
export function rotateAroundPivot(
    point: Vector2,
    pivot: Vector2,
    angleDegrees: number
): Vector2 {
    const rad = degreesToRadians(angleDegrees);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = point.x - pivot.x;
    const dy = point.y - pivot.y;

    return {
        x: pivot.x + dx * cos - dy * sin,
        y: pivot.y + dx * sin + dy * cos,
    };
}

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
