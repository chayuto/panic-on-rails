/**
 * Collision System
 * 
 * Coordinates collision detection and response (explosions, debris).
 */

import type { Train, EdgeId, TrackEdge, Vector2, NodeId, TrackNode } from '../types';
import { detectCollisions } from '../utils/collisionManager';
import { explodeTrain, calculateCrashSeverity } from '../utils/crashPhysics';
import type { CrashedPart } from '../utils/crashPhysics';

export interface CollisionEvent {
    type: 'collision';
    trainIds: string[];
    location: Vector2;
    severity: number;
    debris: CrashedPart[];
}

/**
 * Checks for collisions between trains (any car of one overlapping any car
 * of another) and generates collision events, with debris thrown from where
 * the cars met.
 */
export function checkCollisions(
    trains: Record<string, Train>,
    edges: Record<EdgeId, TrackEdge>,
    random: () => number,
    nodes: Record<NodeId, TrackNode>
): CollisionEvent[] {
    const events: CollisionEvent[] = [];

    detectCollisions(trains, edges, nodes).forEach(({ trainA, trainB, location }) => {
        // Severity is shared by both trains: it depends on their relative speed
        const severity = calculateCrashSeverity(
            { x: trainA.speed * trainA.direction, y: 0 },
            { x: trainB.speed * trainB.direction, y: 0 }
        );

        for (const train of [trainA, trainB]) {
            if (!edges[train.currentEdgeId] || train.crashed) continue;
            const debris = explodeTrain({
                position: location,
                velocity: { x: train.speed * train.direction * 0.5, y: 0 },
                trainColor: train.color,
                severity,
            }, random);

            events.push({
                type: 'collision',
                trainIds: [train.id],
                location,
                severity,
                debris,
            });
        }
    });

    return events;
}
