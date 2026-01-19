/**
 * Track Rendering Utilities
 * 
 * Geometry calculations for track visual rendering.
 * V4: Dual rail track rendering helpers
 * V5: Sleeper generation helpers
 */

import type { Vector2 } from '../types';
import { distance, vectorAngle, vectorSubtract, vectorFromAngle, vectorScale } from './vector';
import { degreesToRadians } from './angle';

// ===========================
// Dual Rail Helpers (V4)
// ===========================

/** Rail gauge and width constants */
export const RAIL = {
    GAUGE: 8,      // Distance between rail centers
    WIDTH: 2,      // Individual rail stroke width
} as const;

/**
 * Calculate points for a parallel line offset from the original.
 * Used to render dual rails for straight track segments.
 * 
 * @param start - Start point of original line
 * @param end - End point of original line  
 * @param offset - Perpendicular offset (positive = left, negative = right)
 * @returns Four values: [startX, startY, endX, endY] for the parallel line
 */
export function getParallelLinePoints(
    start: Vector2,
    end: Vector2,
    offset: number
): [number, number, number, number] {
    const len = distance(start, end);

    if (len === 0) {
        // Degenerate case: zero-length line
        return [start.x, start.y, end.x, end.y];
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    // Perpendicular unit vector
    const perpX = -dy / len;
    const perpY = dx / len;

    // Offset points
    return [
        start.x + perpX * offset,
        start.y + perpY * offset,
        end.x + perpX * offset,
        end.y + perpY * offset,
    ];
}

/**
 * Calculate inner and outer arc radii for dual rail rendering.
 * 
 * @param centerRadius - Radius to the center of the track
 * @param gauge - Distance between rail centers
 * @returns Object with inner and outer radii
 */
export function getDualArcRadii(
    centerRadius: number,
    gauge: number
): { inner: number; outer: number } {
    return {
        inner: centerRadius - gauge / 2,
        outer: centerRadius + gauge / 2,
    };
}

// ===========================
// Sleeper Helpers (V5)
// ===========================

/** Sleeper visual constants */
export const SLEEPER = {
    COLOR: '#5D4E37',  // Tie brown
    WIDTH: 2,
    LENGTH: 14,        // Extends beyond rail gauge
    SPACING: 20,       // Distance between sleepers
} as const;

/** Sleeper position with rotation */
export interface SleeperPosition {
    x: number;
    y: number;
    rotation: number;  // degrees
}

/**
 * Generate sleeper positions along a straight track segment.
 * 
 * @param start - Start point of track
 * @param end - End point of track
 * @param spacing - Distance between sleepers
 * @returns Array of sleeper positions
 */
export function generateStraightSleepers(
    start: Vector2,
    end: Vector2,
    spacing: number
): SleeperPosition[] {
    const sleepers: SleeperPosition[] = [];

    const length = distance(start, end);

    if (length === 0) return sleepers;

    // We still need dx/dy for interpolation, but we can use vectorSubtract
    const diff = vectorSubtract(end, start);
    const angle = vectorAngle(diff);

    // Generate sleepers along the track
    const count = Math.floor(length / spacing);
    for (let i = 0; i <= count; i++) {
        const t = count === 0 ? 0.5 : i / count;
        sleepers.push({
            x: start.x + diff.x * t,
            y: start.y + diff.y * t,
            rotation: angle + 90,  // Perpendicular to track
        });
    }

    return sleepers;
}

/**
 * Generate sleeper positions along an arc track segment.
 * 
 * @param center - Center point of arc
 * @param radius - Radius of arc
 * @param startAngle - Start angle in degrees
 * @param endAngle - End angle in degrees
 * @param spacing - Distance between sleepers
 * @returns Array of sleeper positions
 */
export function generateArcSleepers(
    center: Vector2,
    radius: number,
    startAngle: number,
    endAngle: number,
    spacing: number
): SleeperPosition[] {
    const sleepers: SleeperPosition[] = [];

    // Calculate arc length
    const sweepRad = degreesToRadians(Math.abs(endAngle - startAngle));
    const arcLength = radius * sweepRad;

    if (arcLength === 0) return sleepers;

    // Generate sleepers along the arc
    const count = Math.floor(arcLength / spacing);
    for (let i = 0; i <= count; i++) {
        const t = count === 0 ? 0.5 : i / count;
        const angleDeg = startAngle + (endAngle - startAngle) * t;

        // Calculate position using vector utilities
        // vectorFromAngle returns unit vector for angleDeg
        const offset = vectorScale(vectorFromAngle(angleDeg), radius);

        sleepers.push({
            x: center.x + offset.x,
            y: center.y + offset.y,
            rotation: angleDeg + 90,  // Perpendicular to radius (tangent + 90)
        });
    }

    return sleepers;
}
