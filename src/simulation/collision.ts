/**
 * Collision System
 * 
 * Coordinates collision detection and response (explosions, debris).
 */

import type { Train, EdgeId, TrackEdge, Vector2, NodeId, TrackNode } from '../types';
import { detectCollisions } from '../utils/collisionManager';
import { explodeTrain, calculateCrashSeverity } from '../utils/crashPhysics';
import { getPositionOnEdge } from '../utils/trainGeometry';
import type { CrashedPart } from '../utils/crashPhysics';

export interface CollisionEvent {
    type: 'collision';
    trainIds: string[];
    location: Vector2;
    severity: number;
    debris: CrashedPart[];
}

/**
 * Checks for collisions between trains and generates collision events.
 */
export function checkCollisions(
    trains: Record<string, Train>,
    edges: Record<EdgeId, TrackEdge>,
    random: () => number = Math.random,
    nodes?: Record<NodeId, TrackNode>
): CollisionEvent[] {
    const events: CollisionEvent[] = [];

    detectCollisions(trains, edges).forEach(({ trainA, trainB }) => {
        // Severity is shared by both trains: it depends on their relative speed
        const severity = calculateCrashSeverity(
            { x: trainA.speed * trainA.direction, y: 0 },
            { x: trainB.speed * trainB.direction, y: 0 }
        );

        for (const train of [trainA, trainB]) {
            const edge = edges[train.currentEdgeId];
            if (!edge || train.crashed) continue;

            const position = getPositionOnEdge(edge, train.distanceAlongEdge, nodes);
            const debris = explodeTrain({
                position,
                velocity: { x: train.speed * train.direction * 0.5, y: 0 },
                trainColor: train.color,
                severity,
            }, random);

            events.push({
                type: 'collision',
                trainIds: [train.id],
                location: position,
                severity,
                debris,
            });
        }
    });

    return events;
}
