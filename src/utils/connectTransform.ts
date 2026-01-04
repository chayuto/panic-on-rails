/**
 * Connect Transform Utilities
 * 
 * This module provides functions to calculate the transform needed
 * to connect two track pieces at their endpoints.
 * 
 * Used by Connect Mode for the 2-click connection workflow.
 */

import type {
    Vector2,
    TrackNode,
    TrackEdge,
    NodeId,
    EdgeId,
} from '../types';
import { normalizeAngle, localToWorld } from './snapManager';

// ===========================
// Connection Transform Calculation
// ===========================

/**
 * Calculate the rotation delta needed to align Part B's node to Part A's node.
 * 
 * For two connectors to mate, their facades must be 180° apart.
 * This function calculates how much Part B needs to rotate.
 * 
 * @param targetFacade - The facade direction of Part A's endpoint (degrees)
 * @param sourceFacade - The facade direction of Part B's endpoint (degrees)  
 * @returns The rotation delta to apply to Part B (degrees)
 */
export function calculateRotationForConnection(
    targetFacade: number,
    sourceFacade: number
): number {
    // For proper mating, source facade must equal target facade + 180
    const requiredSourceFacade = normalizeAngle(targetFacade + 180);
    const currentSourceFacade = normalizeAngle(sourceFacade);

    // Rotation delta = desired - current
    const delta = normalizeAngle(requiredSourceFacade - currentSourceFacade);

    return delta;
}

/**
 * Calculate the offset from part origin to a specific node.
 * This is needed to properly position the part after rotation.
 * 
 * @param nodeId - Which node to get offset for
 * @param nodes - All nodes in the graph
 * @param partOrigin - The current origin/placement position of the part
 * @returns The offset vector from origin to node
 */
export function getNodeOffsetFromOrigin(
    nodeId: NodeId,
    nodes: Record<NodeId, TrackNode>,
    partOrigin: Vector2
): Vector2 {
    const node = nodes[nodeId];
    if (!node) {
        return { x: 0, y: 0 };
    }

    return {
        x: node.position.x - partOrigin.x,
        y: node.position.y - partOrigin.y,
    };
}

/**
 * Calculate the origin position of a part from one of its edges.
 * 
 * For simple parts (straight, curve), we use the start node position as origin.
 * For complex parts (switch, crossing), we need to find the entry/common node.
 * 
 * @param edge - Any edge belonging to the part
 * @param nodes - All nodes in the graph
 * @returns The origin position of the part
 */
export function getPartOrigin(
    edge: TrackEdge,
    nodes: Record<NodeId, TrackNode>
): Vector2 {
    const startNode = nodes[edge.startNodeId];
    return startNode?.position || { x: 0, y: 0 };
}

/**
 * Calculate the current rotation of a part from its edge geometry.
 * 
 * @param edge - The edge to analyze
 * @returns Current rotation in degrees
 */
export function getPartRotation(edge: TrackEdge): number {
    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        return normalizeAngle(Math.atan2(dy, dx) * 180 / Math.PI);
    } else {
        // For arcs, rotation is based on the start angle
        // startAngle is now stored in DEGREES per constitution
        const { startAngle } = edge.geometry;
        // Arc start angle is radius angle, tangent is perpendicular
        // Add 90° to get tangent direction
        return normalizeAngle(startAngle + 90);
    }
}

/**
 * Interface for a complete part transform
 */
export interface PartTransform {
    position: Vector2;
    rotation: number; // degrees
}

/**
 * Calculate the complete transform to connect Part B to Part A.
 * 
 * After applying this transform, Part B's source node will:
 * 1. Be at the same position as Part A's target node
 * 2. Have a facade 180° opposite to Part A's target node
 * 
 * @param targetNode - The anchor node from Part A (stays fixed)
 * @param sourceNode - The node from Part B to connect
 * @param sourceEdge - The edge from Part B
 * @param allNodes - All nodes in the graph  
 * @returns The new transform for Part B
 */
export function calculateConnectionTransform(
    targetNode: TrackNode,
    sourceNode: TrackNode,
    sourceEdge: TrackEdge,
    allNodes: Record<NodeId, TrackNode>
): PartTransform {
    // Step 1: Calculate current part origin and rotation
    const currentOrigin = getPartOrigin(sourceEdge, allNodes);
    const currentRotation = getPartRotation(sourceEdge);

    // Step 2: Calculate the rotation needed to align facades
    // sourceNode.rotation is its facade direction in world coords
    const rotationDelta = calculateRotationForConnection(
        targetNode.rotation,
        sourceNode.rotation
    );

    const newRotation = normalizeAngle(currentRotation + rotationDelta);

    // Step 3: Calculate where the source node currently is relative to origin
    const nodeOffset = getNodeOffsetFromOrigin(
        sourceNode.id,
        allNodes,
        currentOrigin
    );

    // Step 4: Rotate the offset by the rotation delta
    const rotatedOffset = localToWorld(nodeOffset, { x: 0, y: 0 }, rotationDelta);

    // Step 5: Calculate new origin so that source node ends up at target position
    // newOrigin + rotatedOffset = targetPosition
    // newOrigin = targetPosition - rotatedOffset
    const newPosition: Vector2 = {
        x: targetNode.position.x - rotatedOffset.x,
        y: targetNode.position.y - rotatedOffset.y,
    };

    return {
        position: newPosition,
        rotation: newRotation,
    };
}

/**
 * Calculate position delta for an individual node when a part rotates.
 * 
 * @param nodePosition - Current node position
 * @param pivotPosition - Position to rotate around
 * @param rotationDelta - Rotation to apply (degrees)
 * @returns New node position
 */
export function rotateNodeAroundPivot(
    nodePosition: Vector2,
    pivotPosition: Vector2,
    rotationDelta: number
): Vector2 {
    const rad = (rotationDelta * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = nodePosition.x - pivotPosition.x;
    const dy = nodePosition.y - pivotPosition.y;

    return {
        x: pivotPosition.x + dx * cos - dy * sin,
        y: pivotPosition.y + dx * sin + dy * cos,
    };
}

/**
 * Validate that two nodes can be connected.
 * 
 * Rules:
 * 1. Both must be open endpoints (exactly 1 connection)
 * 2. They must belong to different parts (different partId on their edges)
 * 
 * @param nodeA - First node
 * @param nodeB - Second node  
 * @param edges - All edges in the graph
 * @returns Object with isValid and error message
 */
export function validateConnection(
    nodeA: TrackNode,
    nodeB: TrackNode,
    edges: Record<EdgeId, TrackEdge>
): { isValid: boolean; error?: string } {
    // Check both are open endpoints
    if (nodeA.connections.length !== 1) {
        return { isValid: false, error: 'Source node is not an open endpoint' };
    }
    if (nodeB.connections.length !== 1) {
        return { isValid: false, error: 'Target node is not an open endpoint' };
    }

    // Get the edges to check if same part
    const edgeA = edges[nodeA.connections[0]];
    const edgeB = edges[nodeB.connections[0]];

    if (!edgeA || !edgeB) {
        return { isValid: false, error: 'Could not find connected edges' };
    }

    if (edgeA.partId === edgeB.partId) {
        return { isValid: false, error: 'Cannot connect a part to itself' };
    }

    return { isValid: true };
}
