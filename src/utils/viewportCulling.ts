/**
 * Viewport Culling Utilities (R14)
 * 
 * Provides functions to determine if objects are visible within the current view
 * to optimize rendering performance.
 */

import type { Vector2, TrackEdge } from '../types';

export interface Viewport {
    x: number;      // Scroll X (pixels)
    y: number;      // Scroll Y (pixels)
    width: number;  // Viewport width (pixels)
    height: number; // Viewport height (pixels)
    scale: number;  // Zoom scale (1.0 = 100%)
}

/**
 * World coordinate viewport
 */
export interface WorldViewport {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

/**
 * Convert screen viewport to world coordinates
 */
export function getWorldViewport(viewport: Viewport, margin: number = 0): WorldViewport {
    // Stage X/Y are negative when panning right/down (moving camera)
    // Formula: world = (screen - stagePos) / scale

    // Left/Top (screen 0,0)
    const minX = (-viewport.x / viewport.scale) - margin;
    const minY = (-viewport.y / viewport.scale) - margin;

    // Right/Bottom (screen width,height)
    const maxX = ((-viewport.x + viewport.width) / viewport.scale) + margin;
    const maxY = ((-viewport.y + viewport.height) / viewport.scale) + margin;

    return { minX, minY, maxX, maxY };
}

/**
 * Check if a bounding box intersects with the viewport
 */
export function isBoundsInViewport(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    viewport: Viewport,
    margin: number = 50
): boolean {
    const world = getWorldViewport(viewport, margin);

    // Check for "No Overlap" condition (separating axis theorem simplified)
    // If one is to the left/right/above/below the other entirely, no intersection.
    return !(
        bounds.maxX < world.minX ||
        bounds.minX > world.maxX ||
        bounds.maxY < world.minY ||
        bounds.minY > world.maxY
    );
}

/**
 * Calculate bounding box for a track edge
 */
export function getEdgeBounds(edge: TrackEdge): { minX: number; minY: number; maxX: number; maxY: number } {
    const PADDING = 20; // Extra padding for track width and selection range

    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        return {
            minX: Math.min(start.x, end.x) - PADDING,
            minY: Math.min(start.y, end.y) - PADDING,
            maxX: Math.max(start.x, end.x) + PADDING,
            maxY: Math.max(start.y, end.y) + PADDING
        };
    } else {
        // Arc geometry
        // Conservative bounds: Center +/- Radius
        // A precise bounding box for an arc sector is complex and expensive.
        // A square around the full circle is fast and safe (guaranteed to contain the arc).
        const { center, radius } = edge.geometry;
        return {
            minX: center.x - radius - PADDING,
            minY: center.y - radius - PADDING,
            maxX: center.x + radius + PADDING,
            maxY: center.y + radius + PADDING
        };
    }
}

/**
 * Check if a simple point is in viewport
 */
export function isPointInViewport(
    point: Vector2,
    viewport: Viewport,
    margin: number = 50
): boolean {
    const world = getWorldViewport(viewport, margin);

    return (
        point.x >= world.minX &&
        point.x <= world.maxX &&
        point.y >= world.minY &&
        point.y <= world.maxY
    );
}
