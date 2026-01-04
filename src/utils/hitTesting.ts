/**
 * Hit Testing Utilities
 * 
 * Functions for determining if a point clicks on a track edge.
 * Uses geometric distance calculations rather than Konva's hit graph
 * for better performance with spatial indexing.
 */

import type { Vector2, TrackEdge, TrackNode } from '../types';

/**
 * Calculate the perpendicular distance from a point to a line segment.
 * 
 * @param point - The point to test
 * @param lineStart - Start of the line segment
 * @param lineEnd - End of the line segment
 * @returns Distance from point to the nearest point on the line segment
 */
export function pointToLineDistance(
    point: Vector2,
    lineStart: Vector2,
    lineEnd: Vector2
): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lineLengthSq = dx * dx + dy * dy;

    // Handle degenerate case where line is actually a point
    if (lineLengthSq === 0) {
        return Math.sqrt(
            Math.pow(point.x - lineStart.x, 2) +
            Math.pow(point.y - lineStart.y, 2)
        );
    }

    // Calculate projection parameter t
    // t = 0 means closest point is lineStart
    // t = 1 means closest point is lineEnd
    // t between 0 and 1 means closest point is on the segment
    const t = Math.max(0, Math.min(1, (
        (point.x - lineStart.x) * dx +
        (point.y - lineStart.y) * dy
    ) / lineLengthSq));

    // Calculate the closest point on the line segment
    const closestX = lineStart.x + t * dx;
    const closestY = lineStart.y + t * dy;

    // Return distance from point to closest point
    return Math.sqrt(
        Math.pow(point.x - closestX, 2) +
        Math.pow(point.y - closestY, 2)
    );
}

/**
 * Calculate distance from a point to an arc (circular segment).
 * Uses a simplified approximation for performance.
 * 
 * @param point - The point to test
 * @param center - Center of the arc
 * @param radius - Radius of the arc
 * @param startAngleDeg - Start angle in DEGREES per constitution
 * @param endAngleDeg - End angle in DEGREES per constitution
 * @returns Approximate distance to the arc
 */
export function pointToArcDistance(
    point: Vector2,
    center: Vector2,
    radius: number,
    startAngleDeg: number,
    endAngleDeg: number
): number {
    // Calculate distance from point to center
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distToCenter = Math.sqrt(dx * dx + dy * dy);

    // Calculate angle of point relative to center (in radians from atan2)
    const pointAngleRad = Math.atan2(dy, dx);
    const pointAngleDeg = (pointAngleRad * 180) / Math.PI;

    // Normalize angles to [0, 360)
    const normalizeAngle = (a: number) => ((a % 360) + 360) % 360;

    const normPointDeg = normalizeAngle(pointAngleDeg);
    const normStartDeg = normalizeAngle(startAngleDeg);
    let normEndDeg = normalizeAngle(endAngleDeg);

    // Handle wrap-around case
    if (normEndDeg < normStartDeg) {
        normEndDeg += 360;
    }

    // Check if point angle falls within arc sweep
    let isWithinArc = false;
    const adjustedPointAngle = normPointDeg < normStartDeg
        ? normPointDeg + 360
        : normPointDeg;

    if (adjustedPointAngle >= normStartDeg && adjustedPointAngle <= normEndDeg) {
        isWithinArc = true;
    }

    if (isWithinArc) {
        // Point is within arc's angular span - distance is difference from radius
        return Math.abs(distToCenter - radius);
    } else {
        // Point is outside arc's angular span - distance to nearest endpoint
        const startAngleRad = (startAngleDeg * Math.PI) / 180;
        const endAngleRad = (endAngleDeg * Math.PI) / 180;
        const startPoint: Vector2 = {
            x: center.x + radius * Math.cos(startAngleRad),
            y: center.y + radius * Math.sin(startAngleRad),
        };
        const endPoint: Vector2 = {
            x: center.x + radius * Math.cos(endAngleRad),
            y: center.y + radius * Math.sin(endAngleRad),
        };

        const distToStart = Math.sqrt(
            Math.pow(point.x - startPoint.x, 2) +
            Math.pow(point.y - startPoint.y, 2)
        );
        const distToEnd = Math.sqrt(
            Math.pow(point.x - endPoint.x, 2) +
            Math.pow(point.y - endPoint.y, 2)
        );

        return Math.min(distToStart, distToEnd);
    }
}

/**
 * Calculate distance from a point to a track edge.
 * Handles both straight and arc geometry.
 * 
 * @param point - The point to test
 * @param edge - The track edge
 * @param startNode - Start node of the edge
 * @param endNode - End node of the edge
 * @returns Distance from point to edge
 */
export function pointToEdgeDistance(
    point: Vector2,
    edge: TrackEdge,
    startNode: TrackNode,
    endNode: TrackNode
): number {
    if (edge.geometry.type === 'straight') {
        return pointToLineDistance(
            point,
            startNode.position,
            endNode.position
        );
    } else {
        // Arc geometry
        const { center, radius, startAngle, endAngle } = edge.geometry;
        return pointToArcDistance(point, center, radius, startAngle, endAngle);
    }
}

/**
 * Result of a hit test query
 */
export interface HitTestResult {
    edgeId: string;
    edge: TrackEdge;
    distance: number;
    /** Approximate position along the edge where the hit occurred (0-1) */
    t: number;
}

/**
 * Find the closest edge to a point from a list of candidate edge IDs.
 * 
 * @param candidateEdgeIds - Array of edge IDs to test (typically from spatial query)
 * @param point - The point to test
 * @param edges - All edges in the store
 * @param nodes - All nodes in the store
 * @param threshold - Maximum distance to consider a hit (in pixels)
 * @returns The closest edge within threshold, or null if none
 */
export function findClosestEdge(
    candidateEdgeIds: string[],
    point: Vector2,
    edges: Record<string, TrackEdge>,
    nodes: Record<string, TrackNode>,
    threshold: number = 15
): HitTestResult | null {
    let closest: HitTestResult | null = null;

    for (const edgeId of candidateEdgeIds) {
        const edge = edges[edgeId];
        if (!edge) continue;

        const startNode = nodes[edge.startNodeId];
        const endNode = nodes[edge.endNodeId];
        if (!startNode || !endNode) continue;

        const distance = pointToEdgeDistance(point, edge, startNode, endNode);

        if (distance <= threshold) {
            if (!closest || distance < closest.distance) {
                // Calculate approximate t (position along edge)
                const t = calculateT(point, edge, startNode, endNode);
                closest = { edgeId, edge, distance, t };
            }
        }
    }

    return closest;
}

/**
 * Calculate the parameter t (0-1) representing position along an edge.
 * Used for placing sensors at click position.
 */
function calculateT(
    point: Vector2,
    edge: TrackEdge,
    startNode: TrackNode,
    endNode: TrackNode
): number {
    if (edge.geometry.type === 'straight') {
        const dx = endNode.position.x - startNode.position.x;
        const dy = endNode.position.y - startNode.position.y;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq === 0) return 0;

        const t = (
            (point.x - startNode.position.x) * dx +
            (point.y - startNode.position.y) * dy
        ) / lengthSq;

        return Math.max(0, Math.min(1, t));
    } else {
        // For arcs, approximate using angle
        // Angles are stored in DEGREES per constitution
        const { center, startAngle, endAngle } = edge.geometry;
        const pointAngleRad = Math.atan2(
            point.y - center.y,
            point.x - center.x
        );
        const pointAngleDeg = (pointAngleRad * 180) / Math.PI;

        const totalAngle = endAngle - startAngle;
        if (Math.abs(totalAngle) < 0.1) return 0.5;  // Threshold for degrees

        const t = (pointAngleDeg - startAngle) / totalAngle;
        return Math.max(0, Math.min(1, t));
    }
}

/**
 * Find the closest node to a point.
 * Used for clicking on switch nodes.
 * 
 * @param candidateNodeIds - Array of node IDs to test
 * @param point - The point to test
 * @param nodes - All nodes in the store
 * @param threshold - Maximum distance to consider a hit (in pixels)
 * @returns The closest node within threshold, or null
 */
export function findClosestNode(
    candidateNodeIds: string[],
    point: Vector2,
    nodes: Record<string, TrackNode>,
    threshold: number = 12
): { nodeId: string; node: TrackNode; distance: number } | null {
    let closest: { nodeId: string; node: TrackNode; distance: number } | null = null;

    for (const nodeId of candidateNodeIds) {
        const node = nodes[nodeId];
        if (!node) continue;

        const distance = Math.sqrt(
            Math.pow(point.x - node.position.x, 2) +
            Math.pow(point.y - node.position.y, 2)
        );

        if (distance <= threshold) {
            if (!closest || distance < closest.distance) {
                closest = { nodeId, node, distance };
            }
        }
    }

    return closest;
}
