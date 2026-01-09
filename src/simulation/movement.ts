/**
 * Train Movement System
 * 
 * Handles calculating train positions, routing through switches/junctions,
 * and bouncing at dead ends.
 */

import type { Train, TrainId, TrackEdge, TrackNode, EdgeId, NodeId } from '../types';
import { getSwitchExitEdge } from '../utils/switchRouting';
import { playSound } from '../utils/audioManager';

export interface TrainUpdate {
    trainId: TrainId;
    distance: number;
    edgeId: EdgeId;
    direction: 1 | -1;
    bounceTime?: number;
}

/**
 * Calculates the new position for a single train given a time delta.
 * Handles edge transitions and graph traversal.
 */
export function calculateTrainMovement(
    train: Train,
    dt: number,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): TrainUpdate | null {
    const edge = edges[train.currentEdgeId];
    if (!edge) return null;

    // Calculate new distance along edge
    let newDistance = train.distanceAlongEdge + train.speed * train.direction * dt;
    let newDirection = train.direction;
    let newEdgeId = train.currentEdgeId;
    let bounceTime: number | undefined = undefined;

    // CHECK: Past End of Edge
    if (newDistance > edge.length) {
        const exitNodeId = edge.endNodeId;
        const exitNode = nodes[exitNodeId];
        const nextEdgeId = resolveNextEdge(train.currentEdgeId, exitNode);

        if (nextEdgeId && edges[nextEdgeId]) {
            // Traverse to next edge
            const nextEdge = edges[nextEdgeId];
            const enterFromStart = nextEdge.startNodeId === exitNodeId;
            newEdgeId = nextEdgeId;
            newDirection = enterFromStart ? 1 : -1;
            newDistance = enterFromStart
                ? (newDistance - edge.length)
                : (nextEdge.length - (newDistance - edge.length));
        } else {
            // Dead end - BOUNCE!
            // Start moving backwards relative to current facing
            // If dragging, we just reverse direction flag effectively
            newDirection = -train.direction as 1 | -1;
            newDistance = edge.length - (newDistance - edge.length);
            bounceTime = performance.now();
            playSound('bounce');
        }
    }
    // CHECK: Past Start of Edge
    else if (newDistance < 0) {
        const exitNodeId = edge.startNodeId;
        const exitNode = nodes[exitNodeId];
        const nextEdgeId = resolveNextEdge(train.currentEdgeId, exitNode);

        if (nextEdgeId && edges[nextEdgeId]) {
            // Traverse to next edge
            const nextEdge = edges[nextEdgeId];
            const enterFromEnd = nextEdge.endNodeId === exitNodeId;
            newEdgeId = nextEdgeId;
            newDirection = enterFromEnd ? -1 : 1;
            newDistance = enterFromEnd
                ? (nextEdge.length + newDistance)
                : (-newDistance);
        } else {
            // Dead end - BOUNCE!
            newDirection = -train.direction as 1 | -1;
            newDistance = Math.abs(newDistance);
            bounceTime = performance.now();
            playSound('bounce');
        }
    }

    // Clamp distance to ensure valid state
    const currentEdgeLength = edges[newEdgeId]?.length || edge.length;
    newDistance = Math.max(0, Math.min(newDistance, currentEdgeLength));

    // Optimize: Only return update if something changed significantly or we moved edges?
    // Actually we need to return update frame-by-frame for smooth animation.
    return {
        trainId: train.id,
        distance: newDistance,
        edgeId: newEdgeId,
        direction: newDirection,
        bounceTime
    };
}

/**
 * details: helper to find next edge from a node
 */
function resolveNextEdge(
    currentEdgeId: EdgeId,
    node: TrackNode | undefined
): EdgeId | null {
    if (!node) return null;

    // Find connections excluding current edge
    const otherConnections = node.connections.filter(id => id !== currentEdgeId);

    if (otherConnections.length === 0) return null;

    // Choice logic
    if (node.type === 'switch' && node.switchBranches) {
        const switchExit = getSwitchExitEdge(node, currentEdgeId);
        if (switchExit && otherConnections.includes(switchExit)) {
            return switchExit;
        }
    }

    // Default: take first available (junction or switch fallback)
    return otherConnections[0];
}
