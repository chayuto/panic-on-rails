/**
 * Crash Physics System
 * 
 * Handles train crashes with "Lego-style" explosive disassembly:
 * - Trains break into parts on collision
 * - Parts have physics (gravity, bounce, momentum)
 * - Creates spectacular, shareable crash moments
 */

import type { Vector2 } from '../types';

// ===========================
// Types
// ===========================

export type CrashPartType = 'body' | 'wheel' | 'chimney' | 'cab' | 'cargo';

export interface CrashedPart {
    id: string;
    type: CrashPartType;
    position: Vector2;
    velocity: Vector2;
    rotation: number;           // radians
    angularVelocity: number;    // radians per second
    mass: number;
    bounceCount: number;
    maxBounces: number;
    color: string;
    settled: boolean;
}

export interface CrashEvent {
    position: Vector2;
    velocity: Vector2;
    trainColor: string;
    severity: number;  // 1-3, affects explosion force
}

import { PHYSICS } from '../config/physics';

// ===========================
// Constants
// ===========================

const {
    GRAVITY, FRICTION, ANGULAR_FRICTION, GROUND_Y, SETTLE_THRESHOLD,
    GROUND_FRICTION, GROUND_ANGULAR_FRICTION,
    CRASH_SPEED_THRESHOLD_LOW, CRASH_SPEED_THRESHOLD_HIGH,
    PARTS: PART_DEFINITIONS,
} = PHYSICS;

// ===========================
// Part ID Generation
// ===========================

let partIdCounter = 0;

function generatePartId(): string {
    return `part-${++partIdCounter}`;
}

// ===========================
// Explosion Functions
// ===========================

/**
 * Explode a train into scattered parts.
 * Creates parts with velocities based on impact and random spread.
 */
export function explodeTrain(crash: CrashEvent): CrashedPart[] {
    const parts: CrashedPart[] = [];
    const { position, velocity, trainColor, severity } = crash;

    // Base explosion force scales with severity (affects velocity scaling)
    const forceMultiplier = 1 + severity * 0.5;

    // Create locomotive body - heavy, tumbles slowly
    parts.push(createPart('body', position, {
        vx: (velocity.x * 0.3 + randomSpread(40)) * forceMultiplier,
        vy: (velocity.y * 0.3 - 80 - randomSpread(40)) * forceMultiplier, // Pop up
    }, trainColor));

    // Create 4 wheels - light, roll away fast
    for (let i = 0; i < 4; i++) {
        const offsetX = (i - 1.5) * 8;
        const offsetY = (i % 2 === 0) ? 4 : -4;

        parts.push(createPart('wheel', {
            x: position.x + offsetX,
            y: position.y + offsetY,
        }, {
            vx: (velocity.x * 0.8 + randomSpread(100)) * forceMultiplier,
            vy: (-60 - randomSpread(40)) * forceMultiplier,
        }, '#333333'));
    }

    // Create chimney - flies high
    parts.push(createPart('chimney', {
        x: position.x + 12,
        y: position.y - 5,
    }, {
        vx: randomSpread(60) * forceMultiplier,
        vy: (-200 - randomSpread(80)) * forceMultiplier, // High arc
    }, '#555555'));

    // Create cab/roof - medium weight
    parts.push(createPart('cab', {
        x: position.x - 10,
        y: position.y,
    }, {
        vx: (velocity.x * 0.4 + randomSpread(50)) * forceMultiplier,
        vy: (-40 - randomSpread(30)) * forceMultiplier,
    }, trainColor));

    return parts;
}

/**
 * Create a single crashed part with physics properties.
 */
function createPart(
    type: CrashPartType,
    position: Vector2,
    baseVelocity: { vx: number; vy: number },
    color: string
): CrashedPart {
    const def = PART_DEFINITIONS[type];

    // Scale velocity by inverse mass (lighter = faster)
    const massScale = 1 / def.mass;

    return {
        id: generatePartId(),
        type,
        position: { ...position },
        velocity: {
            x: baseVelocity.vx * massScale,
            y: baseVelocity.vy * massScale,
        },
        rotation: randomSpread(Math.PI),
        angularVelocity: randomSpread(10) * massScale,
        mass: def.mass,
        bounceCount: 0,
        maxBounces: def.maxBounces,
        color,
        settled: false,
    };
}

/**
 * Generate random spread value for explosion variation.
 */
function randomSpread(range: number): number {
    return (Math.random() - 0.5) * range;
}

// ===========================
// Physics Update
// ===========================

/**
 * Update all crashed parts physics for one frame.
 * 
 * @param parts - Array of crashed parts
 * @param dt - Delta time in seconds
 * @param groundY - Y position of ground/track surface
 * @returns Updated parts array (may be smaller if parts removed)
 */
export function updateCrashedParts(
    parts: CrashedPart[],
    dt: number,
    groundY: number = GROUND_Y
): CrashedPart[] {
    return parts.map(part => {
        if (part.settled) return part;

        // Apply gravity
        part.velocity.y += GRAVITY * dt;

        // Update position
        part.position.x += part.velocity.x * dt;
        part.position.y += part.velocity.y * dt;

        // Update rotation
        part.rotation += part.angularVelocity * dt;

        // Ground collision / bounce
        if (part.position.y > groundY && part.bounceCount < part.maxBounces) {
            part.position.y = groundY;
            part.velocity.y *= -FRICTION;
            part.velocity.x *= FRICTION;
            part.angularVelocity *= ANGULAR_FRICTION;
            part.bounceCount++;
        }

        // Check if settled
        if (part.bounceCount >= part.maxBounces) {
            const speed = Math.sqrt(
                part.velocity.x * part.velocity.x +
                part.velocity.y * part.velocity.y
            );

            if (speed < SETTLE_THRESHOLD) {
                part.settled = true;
                part.velocity = { x: 0, y: 0 };
                part.angularVelocity = 0;
            } else {
                // Apply ground friction
                part.velocity.x *= GROUND_FRICTION;
                part.angularVelocity *= GROUND_ANGULAR_FRICTION;
            }
        }

        return part;
    });
}

/**
 * Remove parts that have been settled for too long.
 * 
 * @param parts - Array of crashed parts
 * @param maxAge - Maximum age in milliseconds before removal
 * @param currentTime - Current time in milliseconds
 */
export function cleanupOldParts(parts: CrashedPart[]): CrashedPart[] {
    // For now, keep all parts - can add age tracking later
    return parts;
}

/**
 * Calculate crash severity based on relative velocity.
 */
export function calculateCrashSeverity(
    velocity1: Vector2,
    velocity2: Vector2 = { x: 0, y: 0 }
): number {
    const relativeVx = velocity1.x - velocity2.x;
    const relativeVy = velocity1.y - velocity2.y;
    const speed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

    // Map speed to severity 1-3
    if (speed < CRASH_SPEED_THRESHOLD_LOW) return 1;
    if (speed < CRASH_SPEED_THRESHOLD_HIGH) return 2;
    return 3;
}
