/**
 * Train Geometry Utilities
 *
 * Pure geometry for a point on an edge. Car placement lives in
 * ./trainCars.ts.
 */

import type {
    TrackEdge,
    TrackNode,
    Vector2,
    NodeId,
} from '../types';

// ===========================
// Position Calculations
// ===========================

import { createGeometryEngine } from '../geometry/engines';
import { normalizeAngle, degreesToRadians, radiansToDegrees } from './angle';

/**
 * Calculate world position from edge geometry and distance along edge.
 * V2: Uses derived geometry when nodes are provided.
 * Delegated to R02 Unified Geometry Engine.
 *
 * @param edge - The track edge
 * @param distance - Distance along the edge (0 to edge.length)
 * @param nodes - Optional node map for V2 derived geometry
 * @returns World position {x, y}
 */
export function getPositionOnEdge(
    edge: TrackEdge,
    distance: number,
    nodes?: Record<NodeId, TrackNode>
): Vector2 {
    if (!nodes) {
        // Fallback for legacy calls without nodes (should rely on edge.geometry)
        // We create a temporary mock nodes record if possible, or warn
        console.warn('[getPositionOnEdge] called without nodes, might fail for derived geometry');
        // We can't easily use createGeometryEngine without nodes if it requires them for derivation
        // But the engine factory accepts nodes.
        // If we strictly enforce nodes, we might break call sites.
        // Let's defer to original logic if no nodes, OR try to construct engine with empty nodes?
        // createGeometryEngine throws if nodes missing for derivation.
        // Let's preserve legacy behavior if nodes missing, BUT prefer engine if present.

        // LEGACY FALLBACK (Inline to avoid circular dep if we moved it)
        const progress = Math.max(0, Math.min(1, distance / edge.length));
        if (edge.geometry.type === 'straight') {
            const { start, end } = edge.geometry;
            return {
                x: start.x + (end.x - start.x) * progress,
                y: start.y + (end.y - start.y) * progress,
            };
        } else {
            const { center, radius, startAngle, endAngle } = edge.geometry;
            const angleDeg = startAngle + (endAngle - startAngle) * progress;
            const angleRad = degreesToRadians(angleDeg);
            return {
                x: center.x + Math.cos(angleRad) * radius,
                y: center.y + Math.sin(angleRad) * radius,
            };
        }
    }

    try {
        const engine = createGeometryEngine(edge, nodes);
        const t = engine.getParameterAtDistance(distance);
        return engine.getPositionAt(t);
    } catch (e) {
        console.warn(`[getPositionOnEdge] Engine failure: ${e}`);
        return { x: 0, y: 0 };
    }
}

/**
 * Calculate rotation angle (in degrees) based on edge geometry and position.
 * V2: Uses derived geometry when nodes are provided.
 * Delegated to R02 Unified Geometry Engine.
 *
 * @param edge - The track edge
 * @param distance - Distance along the edge
 * @param direction - Train direction (1 = forward, -1 = backward)
 * @param nodes - Optional node map for V2 derived geometry
 * @returns Rotation angle in degrees
 */
export function getRotationOnEdge(
    edge: TrackEdge,
    distance: number,
    direction: 1 | -1,
    nodes?: Record<NodeId, TrackNode>
): number {
    if (!nodes) {
        // Legacy fallback
        const progress = Math.max(0, Math.min(1, distance / edge.length));
        if (edge.geometry.type === 'straight') {
            const { start, end } = edge.geometry;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            return radiansToDegrees(angle) + (direction === -1 ? 180 : 0);
        } else {
            const { startAngle, endAngle } = edge.geometry;
            const angleDeg = startAngle + (endAngle - startAngle) * progress;
            // Tangent direction depends on arc sweep: CCW (+90) or CW (-90)
            const isCCW = endAngle > startAngle;
            const tangentAngle = isCCW ? angleDeg + 90 : angleDeg - 90;
            // Flip 180° if train is moving backwards along the arc
            return normalizeAngle(tangentAngle + (direction === -1 ? 180 : 0));
        }
    }

    try {
        const engine = createGeometryEngine(edge, nodes);
        const t = engine.getParameterAtDistance(distance);
        const tangent = engine.getTangentAt(t);

        // Engine returns tangent in direction of path (A->B)
        // If train is moving backwards (-1), we need to flip 180
        return tangent + (direction === -1 ? 180 : 0);
    } catch (e) {
        console.warn(`[getRotationOnEdge] Engine failure: ${e}`);
        return 0;
    }
}
