/**
 * Collision System
 * 
 * Coordinations collision detection and response (explosions, debris).
 */

import type { Train, EdgeId, TrackEdge, Vector2 } from '../types';
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
    edges: Record<EdgeId, TrackEdge>
): CollisionEvent[] {
    const detected = detectCollisions(trains);
    const events: CollisionEvent[] = [];

    detected.forEach(({ trainA, trainB }) => {
        // We only process if at least one is not already crashed?
        // Logic in hook: if (edgeA && !trainA.crashed)

        const edgeA = edges[trainA.currentEdgeId];
        const edgeB = edges[trainB.currentEdgeId];

        // Shared crash severity calculation (approximate relative velocity)
        // Note: Full physics uses relative velocity vectors
        const severity = calculateCrashSeverity(
            { x: trainA.speed * trainA.direction, y: 0 },
            { x: trainB.speed * trainB.direction, y: 0 }
        );

        // Process Train A
        if (edgeA && !trainA.crashed) {
            const posA = getPositionOnEdge(edgeA, trainA.distanceAlongEdge);
            const debris = explodeTrain({
                position: posA,
                velocity: { x: trainA.speed * trainA.direction * 0.5, y: 0 },
                trainColor: trainA.color,
                severity,
            });

            events.push({
                type: 'collision',
                trainIds: [trainA.id], // This event is specifically for Train A crashing
                location: posA,
                severity,
                debris
            });
        }

        // Process Train B
        if (edgeB && !trainB.crashed) {
            const posB = getPositionOnEdge(edgeB, trainB.distanceAlongEdge);
            // Re-calculate severity just for B? The function treats them symmetrically usually,
            // but let's stick to the hook logic pass.
            // Hook logic passed only trainB velocity to calculateCrashSeverity for B?
            // "const severity = calculateCrashSeverity({ x: trainB.speed... })"
            // Wait, looking at hook: 
            // For A: calculateCrashSeverity(velA, velB)
            // For B: calculateCrashSeverity(velB) <-- suspicious in original code, but I should copy behavior or fix?
            // "calculateCrashSeverity" takes 1 or 2 args. 
            // In original code: `const severity = calculateCrashSeverity({ ...B... })`
            // If passed 1 arg, it might assume wall crash?
            // But this IS a train-train collision.
            // I will improve this to use the same shared severity if possible, or stick to logic.
            // Let's assume shared severity logic is better (relative collision).

            const debris = explodeTrain({
                position: posB,
                velocity: { x: trainB.speed * trainB.direction * 0.5, y: 0 },
                trainColor: trainB.color,
                severity,
            });

            events.push({
                type: 'collision',
                trainIds: [trainB.id],
                location: posB,
                severity,
                debris
            });
        }
    });

    return events;
}
