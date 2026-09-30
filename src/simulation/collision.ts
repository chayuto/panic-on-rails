/**
 * Collision System
 *
 * Coordinates collision detection and response (explosions, debris).
 */

import type { Train, EdgeId, TrackEdge, Vector2, NodeId, TrackNode } from '../types';
import { detectCollisions, type CarBody } from '../utils/collisionManager';
import { explodeTrain, calculateCrashSeverity } from '../utils/crashPhysics';
import type { CrashedPart } from '../utils/crashPhysics';

/** One train crashing. */
export interface CollisionEvent {
    type: 'collision';
    trainId: string;
    /** What it ran into: trains crashing with it, or wrecks */
    otherTrainIds: string[];
    location: Vector2;
    severity: number;
    debris: CrashedPart[];
}

/**
 * Checks for collisions between trains (any car of one overlapping any car
 * of another) and generates collision events, with debris thrown from where
 * the cars met.
 *
 * A train that runs into a wreck crashes; the wreck, wrecked already,
 * doesn't again. A train crashes once, however many trains it hits.
 */
export function checkCollisions(
    trains: Record<string, Train>,
    edges: Record<EdgeId, TrackEdge>,
    random: () => number,
    nodes: Record<NodeId, TrackNode>,
    bodies?: CarBody[]
): CollisionEvent[] {
    const crashes = new Map<string, CollisionEvent>();

    for (const { trainA, trainB, location } of detectCollisions(trains, edges, nodes, bodies)) {
        // Severity is shared by both trains: it depends on their relative speed
        const severity = calculateCrashSeverity(
            { x: trainA.speed * trainA.direction, y: 0 },
            { x: trainB.speed * trainB.direction, y: 0 }
        );

        for (const [train, other] of [[trainA, trainB], [trainB, trainA]]) {
            if (!edges[train.currentEdgeId] || train.crashed) continue;
            const crash = crashes.get(train.id);
            if (crash) {
                crash.otherTrainIds.push(other.id);
                continue;
            }
            crashes.set(train.id, {
                type: 'collision',
                trainId: train.id,
                otherTrainIds: [other.id],
                location,
                severity,
                debris: explodeTrain({
                    position: location,
                    velocity: { x: train.speed * train.direction * 0.5, y: 0 },
                    trainColor: train.color,
                    severity,
                    trainId: train.id,
                }, random),
            });
        }
    }

    return [...crashes.values()];
}
