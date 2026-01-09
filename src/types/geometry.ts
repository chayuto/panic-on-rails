/**
 * Geometry Types
 */

import type { Vector2 } from './common';

export interface StraightGeometry {
    type: 'straight';
    start: Vector2;
    end: Vector2;
}

export interface ArcGeometry {
    type: 'arc';
    center: Vector2;
    radius: number;
    startAngle: number; // degrees [0, 360), normalized
    endAngle: number;   // degrees (may exceed 360 for arcs crossing 0°)
}

export type TrackGeometry = StraightGeometry | ArcGeometry;

// ===========================
// Intrinsic Geometry Types (V2)
// ===========================

/**
 * Intrinsic geometry for straight tracks.
 * Contains only properties that don't change when the part moves.
 */
export interface IntrinsicStraightGeometry {
    type: 'straight';
    length: number;
}

/**
 * Intrinsic geometry for arc/curve tracks.
 * Contains only properties that don't change when the part moves.
 */
export interface IntrinsicArcGeometry {
    type: 'arc';
    radius: number;
    sweepAngle: number;  // degrees, always positive
    direction: 'cw' | 'ccw';  // clockwise or counter-clockwise
}

/**
 * Union type for all intrinsic geometry types.
 * Used in V2 architecture to derive world coordinates from node positions.
 */
export type IntrinsicGeometry = IntrinsicStraightGeometry | IntrinsicArcGeometry;
