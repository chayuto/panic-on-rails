/**
 * Crossing Track Creator
 *
 * Creates crossing (level crossing) track pieces with 4 nodes and 2 edges.
 * Crossings have two independent paths that cross at the center.
 *
 * @module trackCreators/crossingTrack
 */

import { v4 as uuidv4 } from 'uuid';
import type { NodeId, EdgeId, TrackNode, TrackEdge, Vector2, PartId } from '../../../types';
import type { CrossingGeometry } from '../../../data/catalog/types';
import { normalizeAngle } from '../../../utils/geometry';

/**
 * Result of creating a crossing track piece.
 */
export interface CrossingTrackResult {
    /** All nodes created (4 endpoints, 2 per path) */
    nodes: TrackNode[];
    /** All edges created (main path, cross path) */
    edges: TrackEdge[];
    /** The primary edge ID (main path) for identification */
    primaryEdgeId: EdgeId;
}

/**
 * Creates a crossing track piece with the given geometry.
 *
 * A crossing consists of:
 * - 4 endpoint nodes (2 for main path, 2 for cross path)
 * - 2 edges (main path and cross path)
 *
 * @param partId - Catalog part ID
 * @param position - Main path start position
 * @param rotation - Main path direction in degrees
 * @param geometry - Crossing geometry from catalog
 * @returns CrossingTrackResult with nodes, edges, and primary edge ID
 */
export function createCrossingTrack(
    partId: PartId,
    position: Vector2,
    rotation: number,
    geometry: CrossingGeometry
): CrossingTrackResult {
    const { length, crossingAngle } = geometry;
    const halfLength = length / 2;
    const radians = (rotation * Math.PI) / 180;

    // Main track (Path A) - follows placement position/rotation
    const endPosition = {
        x: position.x + Math.cos(radians) * length,
        y: position.y + Math.sin(radians) * length,
    };

    // Calculate Center Point (intersection)
    const center: Vector2 = {
        x: position.x + Math.cos(radians) * halfLength,
        y: position.y + Math.sin(radians) * halfLength,
    };

    // Cross track (Path B) - rotated by crossingAngle relative to main
    const crossRadians = radians + (crossingAngle * Math.PI / 180);

    // Calculate Start/End for Cross Track
    // Start is half-length BACKWARDS from center
    const crossStart: Vector2 = {
        x: center.x - Math.cos(crossRadians) * halfLength,
        y: center.y - Math.sin(crossRadians) * halfLength,
    };

    const crossEnd: Vector2 = {
        x: center.x + Math.cos(crossRadians) * halfLength,
        y: center.y + Math.sin(crossRadians) * halfLength,
    };

    // Generate IDs
    const mainEdgeId = uuidv4() as EdgeId;
    const crossEdgeId = uuidv4() as EdgeId;
    const mainStartNodeId = uuidv4() as NodeId;
    const mainEndNodeId = uuidv4() as NodeId;
    const crossStartNodeId = uuidv4() as NodeId;
    const crossEndNodeId = uuidv4() as NodeId;

    // Create Nodes
    const mainStartNode: TrackNode = {
        id: mainStartNodeId,
        position,
        rotation: normalizeAngle(rotation + 180),
        connections: [mainEdgeId],
        type: 'endpoint'
    };
    const mainEndNode: TrackNode = {
        id: mainEndNodeId,
        position: endPosition,
        rotation: normalizeAngle(rotation),
        connections: [mainEdgeId],
        type: 'endpoint'
    };

    const crossStartNode: TrackNode = {
        id: crossStartNodeId,
        position: crossStart,
        rotation: normalizeAngle(rotation + crossingAngle + 180),
        connections: [crossEdgeId],
        type: 'endpoint'
    };
    const crossEndNode: TrackNode = {
        id: crossEndNodeId,
        position: crossEnd,
        rotation: normalizeAngle(rotation + crossingAngle),
        connections: [crossEdgeId],
        type: 'endpoint'
    };

    // Create Edges
    const mainEdge: TrackEdge = {
        id: mainEdgeId,
        partId,
        startNodeId: mainStartNodeId,
        endNodeId: mainEndNodeId,
        geometry: { type: 'straight', start: position, end: endPosition },
        length,
        intrinsicGeometry: { type: 'straight', length },
    };

    const crossEdge: TrackEdge = {
        id: crossEdgeId,
        partId,
        startNodeId: crossStartNodeId,
        endNodeId: crossEndNodeId,
        geometry: { type: 'straight', start: crossStart, end: crossEnd },
        length,
        intrinsicGeometry: { type: 'straight', length },
    };

    return {
        nodes: [mainStartNode, mainEndNode, crossStartNode, crossEndNode],
        edges: [mainEdge, crossEdge],
        primaryEdgeId: mainEdgeId,
    };
}
