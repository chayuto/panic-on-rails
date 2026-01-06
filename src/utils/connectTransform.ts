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
import { normalizeAngle, localToWorld } from './geometry';

// ===========================
// Connection Transform Calculation
// ===========================

/**
 * Determine if a node is the START or END node of its connected edge.
 * 
 * @param nodeId - The node to check
 * @param edge - The edge the node belongs to
 * @returns 'start' if this is the start node, 'end' if end node
 */
export function getNodeConnectorType(
    nodeId: NodeId,
    edge: TrackEdge
): 'start' | 'end' {
    return edge.startNodeId === nodeId ? 'start' : 'end';
}

/**
 * Get the entry facade direction for a switch node.
 * 
 * Switch nodes have 3 connections: 1 entry edge and 2 exit edges (switchBranches).
 * The entry facade is derived from the edge that is NOT in switchBranches.
 * 
 * @param node - The switch node
 * @param edges - All edges in the graph
 * @returns Entry facade direction in degrees [0, 360), or null if not a switch
 */
export function getSwitchEntryFacade(
    node: TrackNode,
    edges: Record<EdgeId, TrackEdge>
): number | null {
    if (node.type !== 'switch' || !node.switchBranches) {
        return null;
    }

    // Find the entry edge (the one NOT in switchBranches)
    const [mainEdgeId, branchEdgeId] = node.switchBranches;
    const entryEdgeId = node.connections.find(
        id => id !== mainEdgeId && id !== branchEdgeId
    );

    if (!entryEdgeId) {
        // Fallback: use the first connection
        const fallbackEdge = edges[node.connections[0]];
        if (!fallbackEdge) return null;
        return getNodeFacadeFromEdge(node.id, fallbackEdge);
    }

    const entryEdge = edges[entryEdgeId];
    if (!entryEdge) return null;

    return getNodeFacadeFromEdge(node.id, entryEdge);
}

/**
 * Derive the facade direction for a node from its connected edge geometry.
 * 
 * Facade = the outward-facing direction at the endpoint (for connection).
 * For endpoints: facade points away from the track, opposite to tangent direction.
 * 
 * This is more reliable than using stored node.rotation, especially for junctions
 * which have multiple facades (one per connected edge).
 * 
 * @param nodeId - The node to get facade for
 * @param edge - The edge connected to this node
 * @returns Facade direction in degrees [0, 360)
 */
export function getNodeFacadeFromEdge(
    nodeId: NodeId,
    edge: TrackEdge
): number {
    const isStart = edge.startNodeId === nodeId;

    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        // Tangent direction from start to end
        const tangent = Math.atan2(dy, dx) * 180 / Math.PI;
        // At start: facade points opposite to tangent (away from track)
        // At end: facade points same as tangent (away from track)
        return normalizeAngle(isStart ? tangent + 180 : tangent);
    } else {
        // Arc geometry: tangent is perpendicular to radius
        const { startAngle, endAngle } = edge.geometry;
        // radiusAngle is the angle from center to the point on the arc
        const radiusAngle = isStart ? startAngle : endAngle;
        // Tangent is 90° CCW from radius (for CCW arc = increasing angles)
        const tangent = radiusAngle + 90;
        // At start: facade points opposite to tangent direction
        // At end: facade points same as tangent direction
        return normalizeAngle(isStart ? tangent + 180 : tangent);
    }
}

/**
 * Calculate the rotation delta needed to align Part B's node to Part A's node.
 * 
 * For smooth track continuation, facades must be 180° apart for proper mating.
 * This applies regardless of whether nodes are START or END - we always want
 * tracks to form a smooth path.
 * 
 * @param targetFacade - The facade direction of Part A's endpoint (degrees)
 * @param sourceFacade - The facade direction of Part B's endpoint (degrees)  
 * @param _isYJunction - Deprecated parameter, kept for API compatibility
 * @returns The rotation delta to apply to Part B (degrees)
 */
export function calculateRotationForConnection(
    targetFacade: number,
    sourceFacade: number,
    _isYJunction: boolean = false
): number {
    const normalizedTarget = normalizeAngle(targetFacade);
    const normalizedSource = normalizeAngle(sourceFacade);

    // For smooth track continuation, facades must be 180° apart
    // This creates a seamless connection where tracks meet end-to-end
    const requiredSourceFacade = normalizeAngle(normalizedTarget + 180);

    // Rotation delta = desired - current
    const delta = normalizeAngle(requiredSourceFacade - normalizedSource);

    // Optimize: if delta is close to 360°, treat as 0° (no rotation needed)
    // This handles floating point edge cases
    if (delta > 359.5) {
        return 0;
    }

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
 * 3. They must not already be connected through the network (would create cycle)
 * 
 * @param nodeA - First node
 * @param nodeB - Second node  
 * @param edges - All edges in the graph
 * @param nodes - All nodes in the graph (for cycle detection)
 * @returns Object with isValid and error message
 */
export function validateConnection(
    nodeA: TrackNode,
    nodeB: TrackNode,
    edges: Record<EdgeId, TrackEdge>,
    nodes?: Record<NodeId, TrackNode>
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

    // Check if nodes are already connected through the network (would create cycle)
    if (nodes) {
        if (areNodesConnected(nodeA.id, nodeB.id, nodes, edges)) {
            return { isValid: false, error: 'Parts are already connected (would create cycle)' };
        }
    }

    return { isValid: true };
}

/**
 * Check if two nodes are already connected through the track network.
 * Uses BFS to traverse the graph from nodeA and check if nodeB is reachable.
 */
function areNodesConnected(
    nodeAId: NodeId,
    nodeBId: NodeId,
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>
): boolean {
    const visited = new Set<NodeId>();
    const queue: NodeId[] = [nodeAId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;

        if (currentId === nodeBId) {
            return true; // Found a path
        }

        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const currentNode = nodes[currentId];
        if (!currentNode) continue;

        // Traverse all connected edges
        for (const edgeId of currentNode.connections) {
            const edge = edges[edgeId];
            if (!edge) continue;

            // Find the other node of this edge
            const nextNodeId = edge.startNodeId === currentId
                ? edge.endNodeId
                : edge.startNodeId;

            if (!visited.has(nextNodeId)) {
                queue.push(nextNodeId);
            }
        }
    }

    return false;
}
