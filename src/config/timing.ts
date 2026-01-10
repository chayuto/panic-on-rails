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
} as const;
