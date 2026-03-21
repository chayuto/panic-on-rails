/**
 * Train Movement System
 *
 * Handles calculating train positions, routing through switches/junctions,
 * and bouncing at dead ends.
 */

import type { Train, TrainId, TrackEdge, TrackNode, EdgeId, NodeId } from '../types';
import { getSwitchExitEdge } from '../utils/switchRouting';
import { playSound } from '../utils/audioManager';

/** Maximum edge transitions per frame to prevent infinite loops */
const MAX_TRAVERSALS_PER_FRAME = 10;

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
 * Supports multi-edge traversal per frame via a while loop with safety limit.
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
    let traversals = 0;

    // Multi-edge traversal loop
    while (traversals < MAX_TRAVERSALS_PER_FRAME) {
        const currentEdge = edges[newEdgeId];
        if (!currentEdge) break;

        // CHECK: Past End of Edge
        if (newDistance > currentEdge.length) {
            const overflow = newDistance - currentEdge.length;
            const exitNodeId = currentEdge.endNodeId;
            const exitNode = nodes[exitNodeId];
            const nextEdgeId = resolveNextEdge(newEdgeId, exitNode);

            if (nextEdgeId && edges[nextEdgeId]) {
                // Traverse to next edge
                const nextEdge = edges[nextEdgeId];
                const enterFromStart = nextEdge.startNodeId === exitNodeId;
                newEdgeId = nextEdgeId;
                newDirection = enterFromStart ? 1 : -1;
                newDistance = enterFromStart
                    ? overflow
                    : (nextEdge.length - overflow);
                traversals++;
                continue; // Check if we overflow this edge too
            } else {
                // Dead end - BOUNCE!
                newDirection = -newDirection as 1 | -1;
                newDistance = currentEdge.length - overflow;
                // W18: Clamp after bounce to prevent negative overflow
                newDistance = Math.max(0, Math.min(newDistance, currentEdge.length));
                bounceTime = performance.now();
                playSound('bounce');
                break;
            }
        }
        // CHECK: Past Start of Edge
        else if (newDistance < 0) {
            const overflow = -newDistance; // positive amount past start
            const exitNodeId = currentEdge.startNodeId;
            const exitNode = nodes[exitNodeId];
            const nextEdgeId = resolveNextEdge(newEdgeId, exitNode);

            if (nextEdgeId && edges[nextEdgeId]) {
                // Traverse to next edge
                const nextEdge = edges[nextEdgeId];
                const enterFromEnd = nextEdge.endNodeId === exitNodeId;
                newEdgeId = nextEdgeId;
                newDirection = enterFromEnd ? -1 : 1;
                newDistance = enterFromEnd
                    ? (nextEdge.length - overflow)
                    : overflow;
                traversals++;
                continue; // Check if we overflow this edge too
            } else {
                // Dead end - BOUNCE!
                newDirection = -newDirection as 1 | -1;
                newDistance = overflow;
                // W18: Clamp after bounce
                newDistance = Math.max(0, Math.min(newDistance, currentEdge.length));
                bounceTime = performance.now();
                playSound('bounce');
                break;
            }
        }
        // Within edge bounds — done
        else {
            break;
        }
    }

    // Final clamp to ensure valid state
    const finalEdge = edges[newEdgeId];
    const finalLength = finalEdge?.length || edge.length;
    newDistance = Math.max(0, Math.min(newDistance, finalLength));

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
        // W17: Switch routing returned null or invalid edge — log warning and use fallback
        console.warn(
            `[movement] getSwitchExitEdge returned null for switch node ${node.id} ` +
            `(entry edge: ${currentEdgeId}). Falling back to first available connection.`
        );
    }

    // Default: take first available (junction or switch fallback)
    return otherConnections[0];
}
