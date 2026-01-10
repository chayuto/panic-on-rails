/**
 * Train Geometry Utilities
 *
 * Pure geometry calculations for train positioning and rendering.
 * Extracted from TrainLayer.tsx for reusability and testability.
 */

import type {
    Train,
    TrackEdge,
    TrackNode,
    Vector2,
    EdgeId,
    NodeId,
} from '../types';
import { DEFAULT_CARRIAGE_SPACING } from '../stores/useSimulationStore';

// ===========================
// Constants
// ===========================

/** Duration of bounce animation in milliseconds */
export const BOUNCE_DURATION = 300;

// ===========================
// Position Calculations
// ===========================

/**
 * Calculate world position from edge geometry and distance along edge.
 * V2: Uses derived geometry when nodes are provided.
 *
 * @param edge - The track edge
 * @param distance - Distance along the edge (0 to edge.length)
 * @param nodes - Optional node map for V2 derived geometry
 * @returns World position {x, y}
 */
import { createGeometryEngine } from '../geometry/engines';

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
            const angleRad = (angleDeg * Math.PI) / 180;
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
            return (angle * 180 / Math.PI) + (direction === -1 ? 180 : 0);
        } else {
            const { startAngle, endAngle } = edge.geometry;
            const angleDeg = startAngle + (endAngle - startAngle) * progress;
            const tangentAngle = angleDeg + 90; // Tangent to circle
            const arcDirection = endAngle > startAngle ? 1 : -1;
            return tangentAngle + (direction * arcDirection === -1 ? 180 : 0);
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

// ===========================
// Carriage Position Tracking
// ===========================

/** Position info for a single carriage */
export interface CarriagePosition {
    position: Vector2;
    rotation: number;  // degrees
    edgeId: EdgeId;
    distanceAlongEdge: number;
}

/**
 * Calculate positions for all carriages in a train by tracing back along the track.
 * The locomotive is at the front, carriages follow behind.
 *
 * @param train - The train object
 * @param edges - All track edges
 * @param nodes - All track nodes
 * @returns Array of carriage positions, index 0 = locomotive
 */
export function getCarriagePositions(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): CarriagePosition[] {
    const positions: CarriagePosition[] = [];
    const carriageCount = train.carriageCount ?? 1;
    const spacing = train.carriageSpacing ?? DEFAULT_CARRIAGE_SPACING;

    // Start with locomotive position
    let currentEdgeId = train.currentEdgeId;
    let currentDistance = train.distanceAlongEdge;
    let currentDirection = train.direction;

    for (let i = 0; i < carriageCount; i++) {
        const edge = edges[currentEdgeId];
        if (!edge) break;

        // Calculate position for this carriage (V2: uses derived geometry via nodes)
        const pos = getPositionOnEdge(edge, currentDistance, nodes);
        const rot = getRotationOnEdge(edge, currentDistance, currentDirection, nodes);

        positions.push({
            position: pos,
            rotation: rot,
            edgeId: currentEdgeId,
            distanceAlongEdge: currentDistance,
        });

        // For subsequent carriages, trace back along the track
        if (i < carriageCount - 1) {
            // Move backwards by spacing amount (opposite to train direction)
            let remainingDistance = spacing;
            // Maximum iterations to prevent infinite loops in complex track layouts
            const MAX_ITERATIONS = 100;
            let iterations = 0;

            while (remainingDistance > 0 && iterations < MAX_ITERATIONS) {
                iterations++;
                const edge = edges[currentEdgeId];
                if (!edge) break;

                // Calculate distance available on current edge in backward direction
                let availableDistance: number;
                if (currentDirection === 1) {
                    // Moving forward on edge, so backward = toward start
                    availableDistance = currentDistance;
                } else {
                    // Moving backward on edge, so backward = toward end
                    availableDistance = edge.length - currentDistance;
                }

                if (availableDistance >= remainingDistance) {
                    // Enough room on current edge
                    if (currentDirection === 1) {
                        currentDistance -= remainingDistance;
                    } else {
                        currentDistance += remainingDistance;
                    }
                    remainingDistance = 0;
                } else {
                    // Need to transition to previous edge
                    remainingDistance -= availableDistance;

                    // Find the entry node (where we came from)
                    const entryNodeId = currentDirection === 1 ? edge.startNodeId : edge.endNodeId;
                    const entryNode = nodes[entryNodeId];

                    if (!entryNode) break;

                    // Find other connections (excluding current edge)
                    const otherConnections = entryNode.connections.filter(id => id !== currentEdgeId);

                    if (otherConnections.length === 0) {
                        // Dead end - carriage stays at edge boundary
                        if (currentDirection === 1) {
                            currentDistance = 0;
                        } else {
                            currentDistance = edge.length;
                        }
                        break;
                    }

                    // Take first available connection (simple path following)
                    // Note: This is a simplification that works for simple track layouts.
                    // For complex junctions with multiple paths, a proper path history
                    // would need to be tracked. This is acceptable for the current toy simulation.
                    const prevEdgeId = otherConnections[0];
                    const prevEdge = edges[prevEdgeId];

                    if (!prevEdge) break;

                    // Determine how we entered the previous edge and set direction
                    // for continued backward tracing
                    currentEdgeId = prevEdgeId;
                    if (prevEdge.endNodeId === entryNodeId) {
                        // We're at the end of the previous edge
                        // To trace backward (toward start), we need direction=1
                        // because backward for direction=1 is toward start (decreasing distance)
                        currentDistance = prevEdge.length;
                        currentDirection = 1;
                    } else {
                        // We're at the start of the previous edge
                        // To trace backward (toward end), we need direction=-1
                        // because backward for direction=-1 is toward end (increasing distance)
                        currentDistance = 0;
                        currentDirection = -1;
                    }
                }
            }
        }
    }

    return positions;
}

// ===========================
// Animation Helpers
// ===========================

/**
 * Calculate bounce animation scale using easeOutElastic.
 *
 * @param bounceTime - Timestamp when bounce started (from performance.now())
 * @returns Scale factors for X and Y axes
 */
export function getBounceScale(bounceTime: number | undefined): { scaleX: number; scaleY: number } {
    if (!bounceTime) return { scaleX: 1, scaleY: 1 };

    const elapsed = performance.now() - bounceTime;
    if (elapsed > BOUNCE_DURATION) return { scaleX: 1, scaleY: 1 };

    // Normalize progress 0 to 1
    const t = elapsed / BOUNCE_DURATION;

    // EaseOutElastic for bouncy feel
    const c4 = (2 * Math.PI) / 3;
    const elasticValue = t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;

    // Squash: at t=0, scaleX=1.3, scaleY=0.7
    // Stretch back with elastic overshoot
    const squash = 0.3 * (1 - elasticValue);
    const scaleX = 1 + squash;
    const scaleY = 1 - squash;

    return { scaleX, scaleY };
}

// ===========================
// Color Utilities
// ===========================

/**
 * Lighten a hex color by a percentage.
 *
 * @param hex - Hex color string (with or without #)
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened hex color string with #
 */
export function lightenColor(hex: string, percent: number): string {
    // Remove # if present
    const h = hex.replace('#', '');

    // Parse RGB
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);

    // Lighten
    const newR = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}
