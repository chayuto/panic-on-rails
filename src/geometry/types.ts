import type { Vector2, BoundingBox } from '../types';

export interface GeometryEngine {
    /**
     * Get world position at normalized parameter t (0 to 1).
     * @param t - Normalized distance along the path [0, 1]
     */
    getPositionAt(t: number): Vector2;

    /**
     * Get tangent angle in DEGREES at normalized parameter t.
     * @param t - Normalized distance along the path [0, 1]
     * @returns Angle in degrees [0, 360)
     */
    getTangentAt(t: number): number;

    /**
     * Get the total length of the path in world units (pixels).
     */
    getLength(): number;

    /**
     * Get the axis-aligned bounding box of the path.
     */
    getBounds(): BoundingBox;

    /**
     * Convert world distance to normalized parameter t.
     * @param distance - Distance from start of path
     * @returns t [0, 1]
     */
    getParameterAtDistance(distance: number): number;
}
