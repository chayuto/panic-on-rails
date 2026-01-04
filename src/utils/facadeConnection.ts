/**
 * Facade-Based Connection Utilities
 * 
 * This module implements a simpler connection model where each track connector
 * has a "facade angle" - the direction it faces outward from the track.
 * 
 * For two connectors to mate:
 * 1. They must be at the same position (within tolerance)
 * 2. Their facades must face OPPOSITE directions (differ by 180° ± tolerance)
 */

import type { PartDefinition, Vector2, PartGeometry } from '../types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum distance for connectors to be considered for mating (pixels) */
export const MATE_DISTANCE_THRESHOLD = 10;

/** Maximum facade angle difference from 180° for valid mating (degrees) */
export const MATE_ANGLE_TOLERANCE = 45;

// =============================================================================
// TYPES
// =============================================================================

/** A connector on a track piece with its world position and facade angle */
export interface TrackConnector {
    position: Vector2;
    facadeAngle: number;  // Direction connector faces (degrees, 0-360)
    type: 'start' | 'end';
}

/** Result of calculating connectors for a placed track piece */
export interface PlacedConnectors {
    start: TrackConnector;
    end: TrackConnector;
}

// =============================================================================
// ANGLE UTILITIES
// =============================================================================

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
}

/**
 * Calculate the smallest angular difference between two angles.
 * Result is always in range [0, 180].
 */
export function angleDifference(a: number, b: number): number {
    const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    return diff > 180 ? 360 - diff : diff;
}

/**
 * Check if two facade angles are compatible for mating.
 * They must face opposite directions (180° apart, within tolerance).
 */
export function canMate(facadeA: number, facadeB: number, tolerance = MATE_ANGLE_TOLERANCE): boolean {
    const diff = angleDifference(facadeA, facadeB);
    // For valid mating, difference should be close to 180°
    return Math.abs(diff - 180) <= tolerance;
}

// =============================================================================
// CONNECTOR CALCULATIONS
// =============================================================================

/**
 * Calculate the facade angle for a track's START connector.
 * The START connector faces BACKWARD (opposite to track direction).
 * 
 * @param trackRotation - The track's forward direction (degrees)
 * @returns Facade angle (degrees, 0-360)
 */
export function getStartFacade(trackRotation: number): number {
    // Start connector faces backward (opposite of track direction)
    return normalizeAngle(trackRotation + 180);
}

/**
 * Calculate the facade angle for a track's END connector.
 * The END connector faces FORWARD (same as track direction at that point).
 * 
 * @param trackRotation - The track's forward direction at start (degrees)
 * @param geometry - Part geometry (determines how direction changes)
 * @returns Facade angle (degrees, 0-360)
 */
export function getEndFacade(trackRotation: number, geometry: PartGeometry): number {
    if (geometry.type === 'straight') {
        // Straight track: direction doesn't change
        return normalizeAngle(trackRotation);
    } else if (geometry.type === 'curve') {
        // Curve: direction changes by the curve angle
        return normalizeAngle(trackRotation + geometry.angle);
    }
    // Default for switches/crossings (would need more complex logic)
    return normalizeAngle(trackRotation);
}

/**
 * Calculate both connectors for a track piece at a given position and rotation.
 */
export function getPlacedConnectors(
    position: Vector2,
    rotation: number,
    part: PartDefinition
): PlacedConnectors {
    const startFacade = getStartFacade(rotation);
    const endFacade = getEndFacade(rotation, part.geometry);

    // Calculate end position based on geometry
    const endPosition = calculateEndPosition(position, rotation, part.geometry);

    return {
        start: {
            position: position,
            facadeAngle: startFacade,
            type: 'start',
        },
        end: {
            position: endPosition,
            facadeAngle: endFacade,
            type: 'end',
        },
    };
}

/**
 * Calculate the position of the END connector given START position and rotation.
 */
export function calculateEndPosition(
    startPos: Vector2,
    rotation: number,
    geometry: PartGeometry
): Vector2 {
    const rotRad = (rotation * Math.PI) / 180;

    if (geometry.type === 'straight') {
        return {
            x: startPos.x + Math.cos(rotRad) * geometry.length,
            y: startPos.y + Math.sin(rotRad) * geometry.length,
        };
    } else if (geometry.type === 'curve') {
        const { radius, angle } = geometry;
        const angleRad = (angle * Math.PI) / 180;

        // Arc center is 90° counter-clockwise from heading (left curve)
        const centerAngle = rotRad - Math.PI / 2;
        const centerX = startPos.x + Math.cos(centerAngle) * radius;
        const centerY = startPos.y + Math.sin(centerAngle) * radius;

        // End point on arc
        const endAngle = centerAngle + Math.PI + angleRad;
        return {
            x: centerX + Math.cos(endAngle) * radius,
            y: centerY + Math.sin(endAngle) * radius,
        };
    }

    // Default (shouldn't happen for simple tracks)
    return startPos;
}

// =============================================================================
// SNAP CALCULATIONS
// =============================================================================

/**
 * Given a target connector to mate with, calculate what rotation would
 * align a track's specific connector (start or end) to mate properly.
 * 
 * @param targetFacade - Facade angle of target connector (degrees)
 * @param connectorType - Which connector to align ('start' or 'end')
 * @param geometry - Part geometry
 * @returns Required track rotation (degrees)
 */
export function calculateMatingRotation(
    targetFacade: number,
    connectorType: 'start' | 'end',
    geometry: PartGeometry
): number {
    // For mating, our connector must face opposite to target
    const requiredFacade = normalizeAngle(targetFacade + 180);

    if (connectorType === 'start') {
        // Start facade = rotation + 180
        // So rotation = requiredFacade - 180 = requiredFacade + 180
        return normalizeAngle(requiredFacade + 180);
    } else {
        // End facade = rotation + curveAngle (for curves) or rotation (for straight)
        let deltaAngle = 0;
        if (geometry.type === 'curve') {
            deltaAngle = geometry.angle;
        }
        // endFacade = rotation + deltaAngle = requiredFacade
        // rotation = requiredFacade - deltaAngle
        return normalizeAngle(requiredFacade - deltaAngle);
    }
}

/**
 * Calculate where a track's START position would be if its END is at a target position.
 */
export function calculateStartFromEnd(
    endPosition: Vector2,
    rotation: number,
    geometry: PartGeometry
): Vector2 {
    // Calculate where END would be relative to origin
    const relativeEnd = calculateEndPosition({ x: 0, y: 0 }, rotation, geometry);

    // START = END - relative offset
    return {
        x: endPosition.x - relativeEnd.x,
        y: endPosition.y - relativeEnd.y,
    };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that a proposed connection is valid (facades face each other).
 * Returns a descriptive error message if invalid, or null if valid.
 */
export function validateConnection(
    connector1: TrackConnector,
    connector2: TrackConnector,
    distanceThreshold = MATE_DISTANCE_THRESHOLD,
    angleThreshold = MATE_ANGLE_TOLERANCE
): string | null {
    // Check distance
    const distance = Math.hypot(
        connector1.position.x - connector2.position.x,
        connector1.position.y - connector2.position.y
    );
    if (distance > distanceThreshold) {
        return `Connectors too far apart: ${distance.toFixed(1)}px (max ${distanceThreshold}px)`;
    }

    // Check facade compatibility
    if (!canMate(connector1.facadeAngle, connector2.facadeAngle, angleThreshold)) {
        const diff = angleDifference(connector1.facadeAngle, connector2.facadeAngle);
        return `Facade angles incompatible: ${connector1.facadeAngle.toFixed(0)}° vs ${connector2.facadeAngle.toFixed(0)}° (diff=${diff.toFixed(0)}°, need ~180°)`;
    }

    return null;
}
