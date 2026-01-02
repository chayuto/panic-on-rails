/**
 * Helper Factory Functions for Creating Parts
 * 
 * These functions reduce boilerplate when adding new parts.
 * Contributors should use these instead of manually creating objects.
 * 
 * @example
 * // Before (6 lines):
 * { id: 'kato-20-000', name: 'Straight 248mm', brand: 'kato', scale: 'n-scale', geometry: { type: 'straight', length: 248 } }
 * 
 * // After (1 line):
 * straight('kato-20-000', 'Straight 248mm', 248, 'kato', 'n-scale')
 */

import type { PartDefinition, PartBrand, PartScale } from './types';

// ===========================
// Straight Track
// ===========================

/**
 * Create a straight track part
 * 
 * @param id - Unique identifier (format: brand-productcode)
 * @param name - Display name
 * @param length - Length in millimeters
 * @param brand - Manufacturer brand
 * @param scale - Track scale/system
 * @param cost - Cost in cents (default: based on length)
 */
export function straight(
    id: string,
    name: string,
    length: number,
    brand: PartBrand,
    scale: PartScale,
    cost?: number
): PartDefinition {
    // Default cost: ~$0.02 per mm, min $2
    const defaultCost = Math.max(200, Math.round(length * 2));
    return {
        id,
        name,
        brand,
        scale,
        geometry: { type: 'straight', length },
        cost: cost ?? defaultCost,
    };
}

// ===========================
// Curved Track
// ===========================

/**
 * Create a curved track part
 * 
 * @param id - Unique identifier
 * @param name - Display name
 * @param radius - Curve radius in millimeters
 * @param angle - Arc angle in degrees (e.g., 45, 30, 15)
 * @param brand - Manufacturer brand
 * @param scale - Track scale/system
 * @param cost - Cost in cents (default: based on arc length)
 */
export function curve(
    id: string,
    name: string,
    radius: number,
    angle: number,
    brand: PartBrand,
    scale: PartScale,
    cost?: number
): PartDefinition {
    // Default cost: based on arc length + radius premium
    const arcLength = calculateArcLength(radius, angle);
    const defaultCost = Math.max(300, Math.round(arcLength * 2 + radius * 0.5));
    return {
        id,
        name,
        brand,
        scale,
        geometry: { type: 'curve', radius, angle },
        cost: cost ?? defaultCost,
    };
}

// ===========================
// Switch / Turnout
// ===========================

interface SwitchOptions {
    mainLength: number;
    branchLength: number;
    branchAngle: number;
    branchDirection: 'left' | 'right';
}

/**
 * Create a switch/turnout track part
 * 
 * @param id - Unique identifier
 * @param name - Display name
 * @param opts - Switch geometry options
 * @param brand - Manufacturer brand
 * @param scale - Track scale/system
 * @param cost - Cost in cents (default: $15)
 * 
 * @example
 * switchPart('kato-20-202', '#4 Turnout Left', {
 *   mainLength: 248,
 *   branchLength: 186,
 *   branchAngle: 15,
 *   branchDirection: 'left'
 * }, 'kato', 'n-scale')
 */
export function switchPart(
    id: string,
    name: string,
    opts: SwitchOptions,
    brand: PartBrand,
    scale: PartScale,
    cost: number = 1500
): PartDefinition {
    return {
        id,
        name,
        brand,
        scale,
        geometry: {
            type: 'switch',
            mainLength: opts.mainLength,
            branchLength: opts.branchLength,
            branchAngle: opts.branchAngle,
            branchDirection: opts.branchDirection,
        },
        cost,
    };
}

// ===========================
// Crossing / Diamond
// ===========================

/**
 * Create a crossing/diamond track part
 * 
 * @param id - Unique identifier
 * @param name - Display name
 * @param length - Length of each crossing track in mm
 * @param crossingAngle - Angle of crossing (90 = perpendicular)
 * @param brand - Manufacturer brand
 * @param scale - Track scale/system
 * @param cost - Cost in cents (default: $20)
 */
export function crossing(
    id: string,
    name: string,
    length: number,
    crossingAngle: number,
    brand: PartBrand,
    scale: PartScale,
    cost: number = 2000
): PartDefinition {
    return {
        id,
        name,
        brand,
        scale,
        geometry: { type: 'crossing', length, crossingAngle },
        cost,
    };
}

// ===========================
// Utility Functions
// ===========================

/**
 * Calculate arc length for a curved track
 */
export function calculateArcLength(radius: number, angleDegrees: number): number {
    const angleRadians = (angleDegrees * Math.PI) / 180;
    return radius * angleRadians;
}
