/**
 * Effects Utilities
 * 
 * Animation easing functions and helpers for visual effects.
 */

/**
 * Linear interpolation between two values.
 */
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Ease out cubic - starts fast, slows down at end.
 * Good for smooth fade-outs and natural deceleration.
 */
export function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Infinite pulse that oscillates between min and max.
 * 
 * @param time - Current time in milliseconds
 * @param period - Duration of one complete cycle in ms
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function oscillate(time: number, period: number, min: number, max: number): number {
    const phase = (time % period) / period;
    const wave = (Math.sin(phase * Math.PI * 2) + 1) / 2; // 0 to 1
    return lerp(min, max, wave);
}

/**
 * Calculate progress for an animation.
 * 
 * @param startTime - When the animation started (ms)
 * @param duration - Animation duration (ms)
 * @param currentTime - Current time (ms, defaults to Date.now())
 * @returns Progress 0-1, clamped
 */
export function getProgress(startTime: number, duration: number, currentTime?: number): number {
    const now = currentTime ?? Date.now();
    const elapsed = now - startTime;
    return clamp(elapsed / duration, 0, 1);
}
