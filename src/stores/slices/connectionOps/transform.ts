/**
 * Transform Utilities for Connection Operations
 * 
 * Provides geometric transformation functions for moving parts and networks.
 */

import type { Vector2 } from '../../../types';
import { degreesToRadians } from '../../../utils/geometry';

/**
 * Transform a position by rotating around a pivot and then translating.
 * 
 * NewPos = Pivot + Rotate(Pos - Pivot) + Translation
 * 
 * @param pos - Position to transform
 * @param pivot - Point to rotate around
 * @param rotationDelta - Rotation in degrees
 * @param translation - Translation vector
 * @returns Transformed position
 */
export function transformPosition(
    pos: Vector2,
    pivot: Vector2,
    rotationDelta: number,
    translation: Vector2
): Vector2 {
    const rad = degreesToRadians(rotationDelta);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = pos.x - pivot.x;
    const dy = pos.y - pivot.y;

    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;

    return {
        x: pivot.x + rotatedX + translation.x,
        y: pivot.y + rotatedY + translation.y,
    };
}
