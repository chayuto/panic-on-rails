/**
 * Geometry Utilities for PanicOnRails
 *
 * Single source of truth for all geometric calculations.
 * All angles are in DEGREES per project constitution.
 *
 * @see docs/architecture/constitution.md
 */

import type { Vector2 } from '../types';
import { degreesToRadians, normalizeAngle, radiansToDegrees } from './angle';
import {
    vectorAdd,
    vectorSubtract,
    vectorScale,
    vectorRotate,
    distance,
} from './vector';

export * from './angle';
export * from './vector';

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
    // Rotate local position by world rotation, then add world origin
    return vectorAdd(worldOrigin, vectorRotate(localPos, worldRotation));
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
    // 1. Translate point to be relative to pivot
    const relative = vectorSubtract(point, pivot);
    // 2. Rotate relative vector
    const rotated = vectorRotate(relative, angleDegrees);
    // 3. Translate back
    return vectorAdd(pivot, rotated);
}

/**
 * Calculate arc length for a curved track
 */
export function calculateArcLength(radius: number, angleDegrees: number): number {
    const angleRadians = degreesToRadians(angleDegrees);
    return radius * angleRadians;
}

// ===========================
// V2: Derived World Geometry
// ===========================

import type {
    TrackEdge,
    TrackNode,
    NodeId,
    TrackGeometry,
} from '../types';

/**
 * Calculate the center of an arc given two endpoints, radius, sweep angle, and direction.
 * 
 * Used to derive world geometry from intrinsic geometry.
 * 
 * Mathematical approach:
 * - Find the chord midpoint between start and end
 * - Calculate the perpendicular distance from midpoint to center (apothem)
 * - Move along the perpendicular in the correct direction based on CW/CCW
 * 
 * @param start - Start point of the arc
 * @param end - End point of the arc  
 * @param radius - Radius of the arc
 * @param sweepAngle - Sweep angle in degrees (positive)
 * @param direction - 'cw' for clockwise, 'ccw' for counter-clockwise
 * @returns Center point of the arc
 */
export function calculateArcCenter(
    start: Vector2,
    end: Vector2,
    radius: number,
    sweepAngle: number,
    direction: 'cw' | 'ccw'
): Vector2 {
    const chordLength = distance(start, end);

    if (chordLength < 0.0001) {
        // Start and end are the same point, return midpoint (degenerate case)
        return vectorScale(vectorAdd(start, end), 0.5);
    }

    // Midpoint of chord
    const mid = vectorScale(vectorAdd(start, end), 0.5);

    // Distance from midpoint to center (along perpendicular)
    // For a chord of length c and arc of radius r with sweep θ:
    // c = 2r * sin(θ/2)
    // The distance from midpoint to center along the perpendicular is:
    // d = r * cos(θ/2)
    const sweepRad = degreesToRadians(sweepAngle);
    const halfSweep = sweepRad / 2;
    const apothem = radius * Math.cos(halfSweep);

    // Chord vector
    const chord = vectorSubtract(end, start);

    // Perpendicular direction (normalized)
    // Perpendicular to chord, pointing "left" of the chord direction
    // If chord is (dx, dy), left perp is (-dy, dx)
    // Normalized: (-dy/L, dx/L)
    const perp = {
        x: -chord.y / chordLength,
        y: chord.x / chordLength
    };

    // Center is apothem distance along perpendicular
    // Direction depends on CW/CCW
    const sign = direction === 'ccw' ? 1 : -1;

    // center = mid + perp * apothem * sign
    return vectorAdd(mid, vectorScale(perp, apothem * sign));
}

/**
 * Calculate the endpoint of an arc given start point, radius, and sweep angle.
 * 
 * @param startX - X coordinate of arc start
 * @param startY - Y coordinate of arc start
 * @param radius - Arc radius
 * @param sweepAngleDeg - Sweep angle in degrees (positive = CCW, negative = CW)
 * @param startDirection - Direction at start point in degrees (0 = right)
 * @returns Endpoint position and tangent direction
 */
export function calculateArcEndpoint(
    startX: number,
    startY: number,
    radius: number,
    sweepAngleDeg: number,
    startDirection: number
): { position: { x: number; y: number }; tangentDirection: number } {
    const sweepRad = (sweepAngleDeg * Math.PI) / 180;
    const startDirRad = (startDirection * Math.PI) / 180;

    // Arc center is perpendicular to start direction
    // For CCW (positive sweep): center is 90° left of direction
    // For CW (negative sweep): center is 90° right of direction
    const perpOffset = sweepAngleDeg >= 0 ? Math.PI / 2 : -Math.PI / 2;
    const toCenterAngle = startDirRad + perpOffset;

    const centerX = startX + Math.cos(toCenterAngle) * radius;
    const centerY = startY + Math.sin(toCenterAngle) * radius;

    // Angle from center to start point
    const startAngleFromCenter = Math.atan2(startY - centerY, startX - centerX);

    // Angle from center to end point
    const endAngleFromCenter = startAngleFromCenter + sweepRad;

    // End position
    const endX = centerX + Math.cos(endAngleFromCenter) * radius;
    const endY = centerY + Math.sin(endAngleFromCenter) * radius;

    // Tangent direction at end (perpendicular to radius)
    const tangentDirection = ((endAngleFromCenter * 180) / Math.PI) +
        (sweepAngleDeg >= 0 ? 90 : -90);

    return {
        position: { x: endX, y: endY },
        tangentDirection: normalizeAngle(tangentDirection),
    };
}

/**
 * Derive world geometry from edge's intrinsic geometry and node positions.
 * 
 * This is the V2 approach: store only intrinsic properties, derive world coords.
 * Falls back to stored geometry if intrinsicGeometry is not present.
 * 
 * @param edge - The track edge
 * @param nodes - All nodes in the graph
 * @returns World geometry (same format as edge.geometry), or null if nodes missing
 */
export function deriveWorldGeometry(
    edge: TrackEdge,
    nodes: Record<NodeId, TrackNode>
): TrackGeometry | null {
    if (!edge.intrinsicGeometry) {
        // No intrinsic geometry, fall back to stored geometry
        return edge.geometry;
    }

    const startNode = nodes[edge.startNodeId];
    const endNode = nodes[edge.endNodeId];

    if (!startNode || !endNode) {
        console.warn('[deriveWorldGeometry] Missing nodes for edge:', edge.id.slice(0, 8));
        return null;
    }

    const startPos = startNode.position;
    const endPos = endNode.position;

    if (edge.intrinsicGeometry.type === 'straight') {
        return {
            type: 'straight',
            start: { ...startPos },
            end: { ...endPos },
        };
    }

    // Arc geometry
    const { radius, sweepAngle, direction } = edge.intrinsicGeometry;
    const center = calculateArcCenter(startPos, endPos, radius, sweepAngle, direction);

    // Calculate start and end angles from center
    const startAngle = normalizeAngle(
        radiansToDegrees(Math.atan2(startPos.y - center.y, startPos.x - center.x))
    );

    // End angle = start angle + sweep (CCW) or - sweep (CW)
    const endAngle = direction === 'ccw'
        ? startAngle + sweepAngle
        : startAngle - sweepAngle;

    return {
        type: 'arc',
        center,
        radius,
        startAngle,
        endAngle,
    };
}
