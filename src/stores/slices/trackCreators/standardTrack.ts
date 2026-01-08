/**
 * Standard Track Creator
 *
 * Creates straight and curved track pieces with 2 nodes and 1 edge.
 *
 * @module trackCreators/standardTrack
 */

import { v4 as uuidv4 } from 'uuid';
import type { NodeId, EdgeId, TrackNode, TrackEdge, Vector2, PartId } from '../../../types';
import type { StraightGeometry, CurveGeometry } from '../../../data/catalog/types';
import { calculateArcLength } from '../../../data/catalog';
import { normalizeAngle } from '../../../utils/geometry';

/**
 * Result of creating a standard (straight or curve) track piece.
 */
export interface StandardTrackResult {
    /** The two nodes (start, end) */
    nodes: TrackNode[];
    /** The single edge */
    edges: TrackEdge[];
    /** The edge ID */
    primaryEdgeId: EdgeId;
}

/**
 * Creates a straight track piece.
 *
 * @param partId - Catalog part ID
 * @param position - Start node position
 * @param rotation - Direction in degrees
 * @param geometry - Straight geometry from catalog
 * @returns StandardTrackResult with nodes, edge, and edge ID
 */
export function createStraightTrack(
    partId: PartId,
    position: Vector2,
    rotation: number,
    geometry: StraightGeometry
): StandardTrackResult {
    const edgeId = uuidv4() as EdgeId;
    const startNodeId = uuidv4() as NodeId;
    const endNodeId = uuidv4() as NodeId;

    const radians = (rotation * Math.PI) / 180;
    const endPosition: Vector2 = {
        x: position.x + Math.cos(radians) * geometry.length,
        y: position.y + Math.sin(radians) * geometry.length,
    };

    const startNode: TrackNode = {
        id: startNodeId,
        position,
        rotation: normalizeAngle(rotation + 180),
        connections: [edgeId],
        type: 'endpoint',
    };

    const endNode: TrackNode = {
        id: endNodeId,
        position: endPosition,
        rotation: normalizeAngle(rotation),
        connections: [edgeId],
        type: 'endpoint',
    };

    const edge: TrackEdge = {
        id: edgeId,
        partId,
        startNodeId,
        endNodeId,
        geometry: { type: 'straight', start: position, end: endPosition },
        length: geometry.length,
        intrinsicGeometry: { type: 'straight', length: geometry.length },
    };

    return {
        nodes: [startNode, endNode],
        edges: [edge],
        primaryEdgeId: edgeId,
    };
}

/**
 * Creates a curved track piece.
 *
 * @param partId - Catalog part ID
 * @param position - Start node position
 * @param rotation - Entry direction in degrees
 * @param geometry - Curve geometry from catalog
 * @returns StandardTrackResult with nodes, edge, and edge ID
 */
export function createCurveTrack(
    partId: PartId,
    position: Vector2,
    rotation: number,
    geometry: CurveGeometry
): StandardTrackResult {
    const edgeId = uuidv4() as EdgeId;
    const startNodeId = uuidv4() as NodeId;
    const endNodeId = uuidv4() as NodeId;

    const { radius, angle } = geometry;
    const angleRad = (angle * Math.PI) / 180;
    const startRad = (rotation * Math.PI) / 180;

    // Arc center is perpendicular to start direction
    const centerAngle = startRad - Math.PI / 2; // Left curve by default
    const arcCenter: Vector2 = {
        x: position.x + Math.cos(centerAngle) * radius,
        y: position.y + Math.sin(centerAngle) * radius,
    };

    // End position on the arc
    const endPosition: Vector2 = {
        x: arcCenter.x + Math.cos(centerAngle + Math.PI + angleRad) * radius,
        y: arcCenter.y + Math.sin(centerAngle + Math.PI + angleRad) * radius,
    };
    const endRotation = rotation + angle;
    const length = calculateArcLength(radius, angle);

    const startNode: TrackNode = {
        id: startNodeId,
        position,
        rotation: normalizeAngle(rotation + 180),
        connections: [edgeId],
        type: 'endpoint',
    };

    const endNode: TrackNode = {
        id: endNodeId,
        position: endPosition,
        rotation: normalizeAngle(endRotation),
        connections: [edgeId],
        type: 'endpoint',
    };

    // Build arc geometry
    const centerAngleDeg = rotation - 90;
    const arcStartAngleDeg = normalizeAngle(centerAngleDeg + 180);
    const arcSweepDeg = angle;

    const edge: TrackEdge = {
        id: edgeId,
        partId,
        startNodeId,
        endNodeId,
        geometry: {
            type: 'arc',
            center: arcCenter,
            radius,
            startAngle: arcStartAngleDeg,
            endAngle: arcStartAngleDeg + arcSweepDeg,
        },
        length,
        intrinsicGeometry: {
            type: 'arc',
            radius,
            sweepAngle: angle,
            direction: 'ccw',
        },
    };

    return {
        nodes: [startNode, endNode],
        edges: [edge],
        primaryEdgeId: edgeId,
    };
}
