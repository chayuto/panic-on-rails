/**
 * Timing and Animation constants
 */

export const TIMING = {
    // Game Loop
    FRAME_TIME_60FPS: 1000 / 60,  // ~16.67ms
    DELTA_TIME_CAP: 0.1,          // 100ms cap to prevent huge jumps

    // Animation
    BOUNCE_DURATION: 200,
    FLASH_DURATION: 100,
    SHAKE_DURATION_BASE: 200,

    // A crash plays in slow motion for a moment: this long (ms, real time), at this speed
    CRASH_SLOW_MOTION_MS: 1200,
    CRASH_SLOW_MOTION_SCALE: 0.3,
} as const;
