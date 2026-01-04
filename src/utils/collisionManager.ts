/**
 * Collision Manager for PanicOnRails
 * 
 * Detects train-to-train collisions on the same edge.
 * Supports multi-car trains by considering the full train length.
 */

import type { Train } from '../types';
import { DEFAULT_CARRIAGE_SPACING } from '../stores/useSimulationStore';

/** Base distance threshold for collision detection (in edge units) */
const BASE_COLLISION_THRESHOLD = 15;

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
 * Check for collisions between all pairs of trains.
 * Returns array of collision pairs.
 * 
 * For multi-car trains, collision is detected if any carriage of one train
 * is within threshold distance of any carriage of another train.
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

            // Check if on same edge (simplified - for more accurate multi-car collision,
            // we would need to check if any carriage of train A is on the same edge as
            // any carriage of train B, but this is a reasonable approximation)
            if (trainA.currentEdgeId !== trainB.currentEdgeId) continue;

            // Get distance between train locomotives
            const distance = Math.abs(trainA.distanceAlongEdge - trainB.distanceAlongEdge);

            // Calculate effective collision threshold considering train lengths
            // If trains are approaching, the rear of one train can collide with front of another
            const trainALength = getTrainLength(trainA);
            const trainBLength = getTrainLength(trainB);
            
            // The collision threshold is the base threshold plus half the length of each train
            // This accounts for the case where locomotives are far apart but carriages overlap
            const effectiveThreshold = BASE_COLLISION_THRESHOLD + (trainALength / 2) + (trainBLength / 2);

            if (distance < effectiveThreshold) {
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
