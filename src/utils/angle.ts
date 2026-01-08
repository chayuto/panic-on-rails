/**
 * Angle Utilities for PanicOnRails
 *
 * Moved from geometry.ts
 */

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
