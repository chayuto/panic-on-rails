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
 * Ease out quad - simpler ease out.
 */
export function easeOutQuad(t: number): number {
    return 1 - Math.pow(1 - t, 2);
}

/**
 * Ease out back - overshoots then settles.
 * Perfect for satisfying "snap" animations.
 * 
 * @param overshoot - Amount of overshoot (default 1.70158)
 */
export function easeOutBack(t: number, overshoot: number = 1.70158): number {
    const c3 = overshoot + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
}

/**
 * Ease in out cubic - smooth start and end.
 */
export function easeInOutCubic(t: number): number {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Pulse animation (0 -> 1 -> 0).
 * Good for hover glow effects.
 */
export function pulse(t: number): number {
    return Math.sin(t * Math.PI);
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

/**
 * Check if an animation has completed.
 */
export function isAnimationComplete(startTime: number, duration: number, currentTime?: number): boolean {
    return getProgress(startTime, duration, currentTime) >= 1;
}

/**
 * Color utilities for effects.
 */
export function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
