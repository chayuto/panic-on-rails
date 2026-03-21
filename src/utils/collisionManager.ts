/**
 * Collision Manager for PanicOnRails
 *
 * Detects train-to-train collisions on the same edge,
 * and cross-edge collisions at shared nodes.
 * Supports multi-car trains by considering the full train length.
 */

import type { Train, TrackEdge, EdgeId, NodeId } from '../types';
import { DEFAULT_CARRIAGE_SPACING } from '../stores/useSimulationStore';

/** Base distance threshold for collision detection (in edge units) */
const BASE_COLLISION_THRESHOLD = 15;

/** Distance from edge endpoint to be considered "near a node" */
const NEAR_NODE_THRESHOLD = 20;

export interface CollisionResult {
    trainA: Train;
    trainB: Train;
    edgeId: string;
}

/**
 * Calculate the effective length of a train (from locomotive to last carriage)
 */
export function getTrainLength(train: Train): number {
    const carriageCount = train.carriageCount ?? 1;
    const spacing = train.carriageSpacing ?? DEFAULT_CARRIAGE_SPACING;
    // Length is (n-1) * spacing for n carriages
    return (carriageCount - 1) * spacing;
}

/**
 * Find the shared node ID between two edges, or null if they share none.
 */
function findSharedNode(
    edgeA: TrackEdge,
    edgeB: TrackEdge
): NodeId | null {
    if (edgeA.startNodeId === edgeB.startNodeId || edgeA.startNodeId === edgeB.endNodeId) {
        return edgeA.startNodeId;
    }
    if (edgeA.endNodeId === edgeB.startNodeId || edgeA.endNodeId === edgeB.endNodeId) {
        return edgeA.endNodeId;
    }
    return null;
}

/**
 * Get the distance from a train to a specific node on its edge.
 * Returns the distance along the edge to the node endpoint.
 */
function distanceToNode(
    train: Train,
    edge: TrackEdge,
    nodeId: NodeId
): number {
    if (edge.startNodeId === nodeId) {
        // Node is at the start of the edge (distance 0)
        return train.distanceAlongEdge;
    } else {
        // Node is at the end of the edge (distance = edge.length)
        return edge.length - train.distanceAlongEdge;
    }
}

/**
 * Check for collisions between all pairs of trains.
 * Returns array of collision pairs.
 *
 * For multi-car trains, collision is detected if any carriage of one train
 * is within threshold distance of any carriage of another train.
 *
 * Also detects cross-edge collisions where two trains on different edges
 * are both near a shared node.
 */
export function detectCollisions(
    trains: Record<string, Train>,
    edges?: Record<EdgeId, TrackEdge>
): CollisionResult[] {
    const collisions: CollisionResult[] = [];
    const trainList = Object.values(trains);

    // O(n^2) pairwise check - sufficient for small train counts
    for (let i = 0; i < trainList.length; i++) {
        for (let j = i + 1; j < trainList.length; j++) {
            const trainA = trainList[i];
            const trainB = trainList[j];

            // Skip if already crashed
            if (trainA.crashed || trainB.crashed) continue;

            // Same-edge collision check
            if (trainA.currentEdgeId === trainB.currentEdgeId) {
                // Get distance between train locomotives
                const distance = Math.abs(trainA.distanceAlongEdge - trainB.distanceAlongEdge);

                // Calculate effective collision threshold considering train lengths
                const trainALength = getTrainLength(trainA);
                const trainBLength = getTrainLength(trainB);
                const effectiveThreshold = BASE_COLLISION_THRESHOLD + (trainALength / 2) + (trainBLength / 2);

                if (distance < effectiveThreshold) {
                    collisions.push({
                        trainA,
                        trainB,
                        edgeId: trainA.currentEdgeId,
                    });
                }
                continue;
            }

            // Cross-edge collision check at shared nodes
            if (edges) {
                const edgeA = edges[trainA.currentEdgeId];
                const edgeB = edges[trainB.currentEdgeId];

                if (!edgeA || !edgeB) continue;

                const sharedNodeId = findSharedNode(edgeA, edgeB);
                if (!sharedNodeId) continue;

                // Both trains must be near the shared node
                const distA = distanceToNode(trainA, edgeA, sharedNodeId);
                const distB = distanceToNode(trainB, edgeB, sharedNodeId);

                const trainALength = getTrainLength(trainA);
                const trainBLength = getTrainLength(trainB);
                const effectiveThreshold = NEAR_NODE_THRESHOLD + (trainALength / 2) + (trainBLength / 2);

                if (distA + distB < effectiveThreshold) {
                    collisions.push({
                        trainA,
                        trainB,
                        edgeId: trainA.currentEdgeId,
                    });
                }
            }
        }
    }

    return collisions;
}

/**
 * Check if two trains are approaching each other (head-on collision).
 */
export function isHeadOnCollision(trainA: Train, trainB: Train): boolean {
    // Head-on if moving towards each other
    const aMovingForward = trainA.distanceAlongEdge < trainB.distanceAlongEdge && trainA.direction === 1;
    const bMovingBackward = trainB.distanceAlongEdge > trainA.distanceAlongEdge && trainB.direction === -1;

    return (aMovingForward && bMovingBackward) ||
        (trainA.direction === -1 && trainB.direction === 1);
}
