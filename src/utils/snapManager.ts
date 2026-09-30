/**
 * Snap Manager v2 - Multi-Node Architecture
 * 
 * This module implements the new connector-based snapping system that supports
 * track pieces with multiple nodes (switches, crossings, forks).
 * 
 * Key improvements over v1:
 * - No assumption of exactly 2 nodes per track
 * - Rotation around snap pivot point instead of center
 * - Cleaner separation of concerns
 */

import type {
    Vector2,
    PartDefinition,
    TrackNode,
    NodeId,
    ConnectorNode,
    WorldConnector,
    SnapMatchResult,
    PartScale,
    EdgeId,
    TrackEdge,
} from '../types';
import { DEFAULT_SNAP_CONFIG } from '../types';
import { getPartConnectors } from '../data/catalog/helpers';

// Import geometry utilities from single source of truth
import {
    normalizeAngle,
    angleDifference,
    distance,
    localToWorld,
    rotateAroundPivot,
} from './geometry';

import { isOpenEnd } from './graphAnalysis';

// Re-export for backward compatibility
export { normalizeAngle, angleDifference, distance, localToWorld, rotateAroundPivot };

// ===========================
// Connector Transformation
// ===========================


/**
 * Get all connectors for a part transformed to world coordinates.
 * 
 * @param part - The part definition
 * @param placementPos - World position of the part's primary connector
 * @param placementRotation - World rotation of the part (degrees)
 * @returns Array of connectors with world-space coordinates
 */
export function getWorldConnectors(
    part: PartDefinition,
    placementPos: Vector2,
    placementRotation: number
): WorldConnector[] {
    const connectors = getPartConnectors(part);

    return connectors.nodes.map(node => ({
        localId: node.localId,
        worldPosition: localToWorld(node.localPosition, placementPos, placementRotation),
        worldFacade: normalizeAngle(node.localFacade + placementRotation),
        maxConnections: node.maxConnections,
    }));
}

/**
 * Get connector by local ID
 */
export function getConnectorById(
    part: PartDefinition,
    localId: string
): ConnectorNode | undefined {
    const connectors = getPartConnectors(part);
    return connectors.nodes.find(n => n.localId === localId);
}

// ===========================
// Snap Detection
// ===========================

/**
 * Find all open endpoints in the track graph: plain ends, and points with
 * nothing joined beyond them.
 */
export function findOpenEndpoints(nodes: Record<NodeId, TrackNode>): TrackNode[] {
    return Object.values(nodes).filter(isOpenEnd);
}

/**
 * Check if two facades are compatible for mating (180° opposite within tolerance).
 */
export function areFacadesCompatible(
    facadeA: number,
    facadeB: number,
    tolerance: number
): boolean {
    const diff = angleDifference(facadeA, facadeB);
    // Should be ~180° apart (facing opposite)
    return Math.abs(diff - 180) <= tolerance;
}

/**
 * Calculate the transform needed to snap a ghost connector to a target node.
 * 
 * This figures out where to place the part's origin so that:
 * 1. The specified connector aligns with the target position
 * 2. The connector's facade faces opposite to the target's facade
 * 
 * @param part - The part being placed
 * @param ghostConnectorId - Which connector on the ghost to snap with
 * @param targetNode - The target endpoint to snap to
 * @returns The required origin position and rotation for the ghost
 */
export function calculateSnapTransform(
    part: PartDefinition,
    ghostConnectorId: string,
    targetNode: TrackNode
): { position: Vector2; rotation: number } {
    const connector = getConnectorById(part, ghostConnectorId);
    if (!connector) {
        // Fallback: place at target with opposite rotation
        return {
            position: targetNode.position,
            rotation: normalizeAngle(targetNode.rotation + 180),
        };
    }

    // Required world facade for connector = opposite of target facade
    const requiredConnectorFacade = normalizeAngle(targetNode.rotation + 180);

    // Part rotation = connector world facade - connector local facade
    const partRotation = normalizeAngle(requiredConnectorFacade - connector.localFacade);

    // Now find part origin such that connector ends up at target position
    // worldPos = origin + rotate(localPos, rotation)
    // So: origin = worldPos - rotate(localPos, rotation)
    const rotatedLocalPos = localToWorld(
        connector.localPosition,
        { x: 0, y: 0 },
        partRotation
    );

    const partPosition: Vector2 = {
        x: targetNode.position.x - rotatedLocalPos.x,
        y: targetNode.position.y - rotatedLocalPos.y,
    };

    return {
        position: partPosition,
        rotation: partRotation,
    };
}

/**
 * Candidate for snap matching with scoring metadata
 */
interface SnapCandidate extends SnapMatchResult {
    /** How far from user's current rotation */
    rotationDelta: number;
    /** How well the placed part points toward the cursor (-1..1, higher = better) */
    towardCursor: number;
    /** A curve turning the same way as the track it joins (tiebreaker) */
    continuesCurve: boolean;
    /** Is this the primary connector? (tiebreaker) */
    isPrimary: boolean;
}

/**
 * Which way the track turns as it runs into its open end `node`: +1 right
 * (clockwise on screen), -1 left, 0 straight or unknown.
 */
function turnInto(node: TrackNode, edges: Record<EdgeId, TrackEdge>): -1 | 0 | 1 {
    if (node.connections.length !== 1) return 0;
    const edge = edges[node.connections[0]];
    if (!edge || edge.geometry.type !== 'arc') return 0;
    // Increasing angles run clockwise on screen: a right turn from start to end
    const sweep = Math.sign(edge.geometry.endAngle - edge.geometry.startAngle) as -1 | 0 | 1;
    return edge.endNodeId === node.id ? sweep : (-sweep as -1 | 0 | 1);
}

/**
 * Find the best snap match for a part being placed.
 *
 * Snapping auto-aligns: the part is rotated so the chosen connector mates
 * the target facade, whatever the ghost's current rotation. A connector is a
 * candidate for a target when either
 * - that connector is already within the snap radius of the target
 *   (the user brought that end of the part to the endpoint), or
 * - the cursor is within the snap radius of the target (the user is hovering
 *   the endpoint; any connector may attach there).
 *
 * Ranking: closer target first; then the placement whose body extends toward
 * the cursor (drag slightly left of an endpoint for a left-hand curve, right
 * for right-hand); then least rotation from the user's rotation; then the
 * primary connector.
 *
 * @param part - The part being placed
 * @param ghostPosition - Current ghost position (primary connector location = cursor)
 * @param ghostRotation - Current ghost rotation (degrees)
 * @param openEndpoints - Available endpoints to snap to
 * @param system - Track system for config lookup
 * @param edges - The layout's edges: with them, a curve dropped straight
 *   ahead of a curved track's end carries on turning the same way
 * @returns Best snap result, or null if no snap found
 */
export function findBestSnap(
    part: PartDefinition,
    ghostPosition: Vector2,
    ghostRotation: number,
    openEndpoints: TrackNode[],
    system: PartScale = 'n-scale',
    edges: Record<EdgeId, TrackEdge> = {}
): SnapMatchResult | null {
    const config = DEFAULT_SNAP_CONFIG[system];
    const connectors = getPartConnectors(part);
    const candidates: SnapCandidate[] = [];

    // Get current world positions of all ghost connectors
    const ghostWorldConnectors = getWorldConnectors(part, ghostPosition, ghostRotation);

    for (const target of openEndpoints) {
        const cursorDist = distance(ghostPosition, target.position);
        const trackTurn = part.geometry.type === 'curve' ? turnInto(target, edges) : 0;

        for (const ghostConnector of ghostWorldConnectors) {
            const connectorDist = distance(ghostConnector.worldPosition, target.position);
            const distToTarget = Math.min(connectorDist, cursorDist);
            if (distToTarget > config.snapRadius) {
                continue;
            }

            // Transform that makes this connector mate the target exactly
            const transform = calculateSnapTransform(part, ghostConnector.localId, target);

            // Where would the rest of the part end up, relative to the target?
            const placed = getWorldConnectors(part, transform.position, transform.rotation);
            const centroid = {
                x: placed.reduce((sum, c) => sum + c.worldPosition.x, 0) / placed.length,
                y: placed.reduce((sum, c) => sum + c.worldPosition.y, 0) / placed.length,
            };

            // Which way the piece turns as it leaves the target: right of the
            // facade on screen (+Y down) is (-sin, cos)
            const r = (target.rotation * Math.PI) / 180;
            const side = -Math.sin(r) * (centroid.x - target.position.x) + Math.cos(r) * (centroid.y - target.position.y);
            const pieceTurn = Math.abs(side) < 1e-6 ? 0 : Math.sign(side);

            candidates.push({
                ghostConnectorId: ghostConnector.localId,
                targetNodeId: target.id,
                targetPosition: target.position,
                targetFacade: target.rotation,
                distance: distToTarget,
                ghostTransform: transform,
                rotationDelta: angleDifference(ghostRotation, transform.rotation),
                towardCursor: cosineBetween(
                    { x: centroid.x - target.position.x, y: centroid.y - target.position.y },
                    { x: ghostPosition.x - target.position.x, y: ghostPosition.y - target.position.y },
                ),
                continuesCurve: trackTurn !== 0 && pieceTurn === trackTurn,
                isPrimary: ghostConnector.localId === connectors.primaryNodeId,
            });
        }
    }

    if (candidates.length === 0) {
        return null;
    }

    candidates.sort((a, b) => {
        // Primary: distance to target
        const distDiff = a.distance - b.distance;
        if (Math.abs(distDiff) > 5) return distDiff;

        // Secondary: part extends toward the cursor
        const towardDiff = b.towardCursor - a.towardCursor;
        if (Math.abs(towardDiff) > 0.05) return towardDiff;

        // Cursor straight ahead: a curve keeps turning the way the track does
        if (a.continuesCurve !== b.continuesCurve) return a.continuesCurve ? -1 : 1;

        // Tertiary: least rotation from what the user had
        const rotDiff = a.rotationDelta - b.rotationDelta;
        if (Math.abs(rotDiff) > 10) return rotDiff;

        // Finally: prefer primary connector
        if (a.isPrimary !== b.isPrimary) {
            return a.isPrimary ? -1 : 1;
        }

        return 0;
    });

    const best = candidates[0];

    // Return without internal scoring fields
    return {
        ghostConnectorId: best.ghostConnectorId,
        targetNodeId: best.targetNodeId,
        targetPosition: best.targetPosition,
        targetFacade: best.targetFacade,
        distance: best.distance,
        ghostTransform: best.ghostTransform,
    };
}

/** Cosine of the angle between two vectors; 0 if either is (near) zero. */
function cosineBetween(a: Vector2, b: Vector2): number {
    const la = Math.hypot(a.x, a.y);
    const lb = Math.hypot(b.x, b.y);
    if (la < 1e-6 || lb < 1e-6) return 0;
    return (a.x * b.x + a.y * b.y) / (la * lb);
}

// ===========================
// Advanced Snap: Rotation Around Pivot
// ===========================

/**
 * Apply a rotation to a ghost, keeping a specific connector fixed.
 * 
 * This is used when the user rotates while snapped - the snap point
 * should stay fixed while the rest of the track rotates around it.
 * 
 * @param ghostPosition - Current ghost origin position
 * @param ghostRotation - Current ghost rotation
 * @param part - The part definition
 * @param pivotConnectorId - Which connector is the pivot
 * @param deltaRotation - How much to rotate (degrees)
 * @returns New ghost position and rotation
 */
export function rotateGhostAroundConnector(
    ghostPosition: Vector2,
    ghostRotation: number,
    part: PartDefinition,
    pivotConnectorId: string,
    deltaRotation: number
): { position: Vector2; rotation: number } {
    const connector = getConnectorById(part, pivotConnectorId);
    if (!connector) {
        // No connector found, rotate around origin as fallback
        return {
            position: ghostPosition,
            rotation: normalizeAngle(ghostRotation + deltaRotation),
        };
    }

    // Find current world position of pivot connector
    const pivotWorld = localToWorld(connector.localPosition, ghostPosition, ghostRotation);

    // New rotation
    const newRotation = normalizeAngle(ghostRotation + deltaRotation);

    // Recalculate origin position to keep pivot fixed
    // pivotWorld = newOrigin + rotate(localPos, newRotation)
    // newOrigin = pivotWorld - rotate(localPos, newRotation)
    const rotatedLocalPos = localToWorld(
        connector.localPosition,
        { x: 0, y: 0 },
        newRotation
    );

    return {
        position: {
            x: pivotWorld.x - rotatedLocalPos.x,
            y: pivotWorld.y - rotatedLocalPos.y,
        },
        rotation: newRotation,
    };
}

// ===========================
// Backward Compatibility Exports
// ===========================

// Re-export types for consumers
export type { WorldConnector, SnapMatchResult };
