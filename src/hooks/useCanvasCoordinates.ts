/**
 * useCanvasCoordinates - Coordinate conversion utilities
 *
 * Converts between screen coordinates (client pixels) and world coordinates
 * (canvas units) based on the current viewport state.
 *
 * This hook provides pure conversion functions that account for:
 * - Container position on screen
 * - Current pan offset
 * - Current zoom level
 *
 * Common use cases:
 * - Converting mouse event positions to world coordinates for hit testing
 * - Converting world positions to screen coordinates for tooltips/overlays
 */

import { useCallback } from 'react';
import type { Vector2 } from '../types';

/**
 * Options for configuring the coordinate conversion hook
 */
interface UseCanvasCoordinatesOptions {
    /** Container element ref for bounds calculation */
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Current zoom level */
    zoom: number;
    /** Current pan offset */
    pan: Vector2;
}

/**
 * Coordinate conversion functions returned by the hook
 */
interface CoordinateConverters {
    /**
     * Convert screen (client) coordinates to world coordinates
     * @param screenX - X position in client pixels
     * @param screenY - Y position in client pixels
     * @returns World coordinates
     */
    screenToWorld: (screenX: number, screenY: number) => Vector2;

    /**
     * Convert world coordinates to screen (client) coordinates
     * @param worldX - X position in world units
     * @param worldY - Y position in world units
     * @returns Screen coordinates in client pixels
     */
    worldToScreen: (worldX: number, worldY: number) => Vector2;
}

/**
 * Hook for converting between screen and world coordinate systems.
 *
 * @param options - Configuration options including containerRef, zoom, and pan
 * @returns Object with screenToWorld and worldToScreen conversion functions
 *
 * @example
 * ```tsx
 * const { screenToWorld, worldToScreen } = useCanvasCoordinates({
 *     containerRef,
 *     zoom,
 *     pan,
 * });
 *
 * // In a mouse handler
 * const worldPos = screenToWorld(e.clientX, e.clientY);
 *
 * // For a tooltip position
 * const screenPos = worldToScreen(entity.x, entity.y);
 * ```
 */
export function useCanvasCoordinates({
    containerRef,
    zoom,
    pan,
}: UseCanvasCoordinatesOptions): CoordinateConverters {
    /**
     * Convert screen coordinates to world coordinates.
     *
     * The conversion formula:
     * worldX = (screenX - containerLeft - panX) / zoom
     * worldY = (screenY - containerTop - panY) / zoom
     *
     * This accounts for:
     * 1. Container position on screen (rect.left, rect.top)
     * 2. Current pan offset (pan.x, pan.y)
     * 3. Current zoom level (zoom)
     */
    const screenToWorld = useCallback((screenX: number, screenY: number): Vector2 => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };

        return {
            x: (screenX - rect.left - pan.x) / zoom,
            y: (screenY - rect.top - pan.y) / zoom,
        };
    }, [containerRef, pan.x, pan.y, zoom]);

    /**
     * Convert world coordinates to screen coordinates.
     *
     * The conversion formula (inverse of screenToWorld):
     * screenX = worldX * zoom + panX + containerLeft
     * screenY = worldY * zoom + panY + containerTop
     *
     * This is useful for positioning HTML overlays (like tooltips)
     * over canvas elements.
     */
    const worldToScreen = useCallback((worldX: number, worldY: number): Vector2 => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };

        return {
            x: worldX * zoom + pan.x + rect.left,
            y: worldY * zoom + pan.y + rect.top,
        };
    }, [containerRef, pan.x, pan.y, zoom]);

    return { screenToWorld, worldToScreen };
}
