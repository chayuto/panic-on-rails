/**
 * Collision Manager for PanicOnRails
 * 
 * Detects train-to-train collisions on the same edge.
 */

import type { Train } from '../types';

/** Distance threshold for collision detection (in edge units) */
const COLLISION_THRESHOLD = 15;

export interface CollisionResult {
    trainA: Train;
    trainB: Train;
    edgeId: string;
}

/**
 * Check for collisions between all pairs of trains.
 * Returns array of collision pairs.
 */
export function detectCollisions(
    trains: Record<string, Train>
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

            // Check if on same edge
            if (trainA.currentEdgeId !== trainB.currentEdgeId) continue;

            // Get distance between trains
            const distance = Math.abs(trainA.distanceAlongEdge - trainB.distanceAlongEdge);

            if (distance < COLLISION_THRESHOLD) {
                collisions.push({
                    trainA,
                    trainB,
                    edgeId: trainA.currentEdgeId,
                });
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
