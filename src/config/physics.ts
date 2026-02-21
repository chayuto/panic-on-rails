/**
 * Physics simulation constants
 */

export const PHYSICS = {
    // Global Physics
    GRAVITY: 400,           // pixels per second squared
    FRICTION: 0.85,         // velocity retained per bounce
    ANGULAR_FRICTION: 0.9,  // angular velocity decay
    GROUND_Y: 600,          // canvas bottom baseline

    // Crash Mechanics
    SETTLE_THRESHOLD: 5,    // velocity below which part settles
    CRASH_SPEED_THRESHOLD_LOW: 50,
    CRASH_SPEED_THRESHOLD_HIGH: 150,

    // Ground Friction (post-bounce sliding decay per frame)
    GROUND_FRICTION: 0.95,
    GROUND_ANGULAR_FRICTION: 0.95,

    // Debris Lifetime
    DEBRIS_MAX_AGE_MS: 500, // Time before cleanup (referenced in useGameLoop)

    // Part Properties { mass, maxBounces }
    PARTS: {
        body: { mass: 3.0, maxBounces: 2 },
        wheel: { mass: 0.5, maxBounces: 5 },
        chimney: { mass: 0.3, maxBounces: 3 },
        cab: { mass: 0.8, maxBounces: 2 },
        cargo: { mass: 0.6, maxBounces: 4 },
    }
} as const;
