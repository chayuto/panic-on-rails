/**
 * User interaction constants
 */

/** A set of points' button: 7mm across on the track, but never too small to click. */
export const POINTS_BUTTON = {
    /** Radius on the layout (mm) */
    RADIUS: 7,
    /** Smallest radius on screen (px), however far out the view is zoomed */
    MIN_SCREEN_RADIUS: 6,
} as const;

/** The button's radius on the layout (mm) at `zoom` screen pixels per mm. */
export function pointsButtonRadius(zoom: number): number {
    return Math.max(POINTS_BUTTON.RADIUS, POINTS_BUTTON.MIN_SCREEN_RADIUS / Math.max(zoom, 0.01));
}
