/**
 * The player's motion settings.
 */

/** True when the player has asked their system for less motion. */
export function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
