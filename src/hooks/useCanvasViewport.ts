/**
 * useCanvasViewport - Manages canvas viewport state
 *
 * Handles:
 * - Container dimensions (responsive)
 * - Zoom level with clamping
 * - Pan offset
 * - Viewport bounds calculation
 * - Wheel zoom with zoom-toward-cursor behavior
 *
 * This hook encapsulates all viewport-related logic that was previously
 * scattered throughout StageWrapper.tsx, improving separation of concerns
 * and enabling reuse across canvas components.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import type { Vector2 } from '../types';
import type { BoundingBox } from '../utils/spatialHashGrid';

/**
 * Current viewport state values
 */
interface ViewportState {
    /** Container dimensions in pixels */
    dimensions: { width: number; height: number };
    /** Current zoom level (1 = 100%) */
    zoom: number;
    /** Current pan offset in screen pixels */
    pan: Vector2;
    /** Viewport bounds in world coordinates for spatial culling */
    viewport: BoundingBox;
}

/**
 * Actions to manipulate viewport state
 */
interface ViewportActions {
    /** Set zoom level (clamped to valid range) */
    setZoom: (zoom: number) => void;
    /** Set pan offset */
    setPan: (x: number, y: number) => void;
    /** Reset view to default (zoom=1, pan=0,0) */
    resetView: () => void;
    /**
     * Handle wheel zoom event - zooms toward the pointer position
     * @param deltaY - Wheel delta (positive = zoom out, negative = zoom in)
     * @param pointerX - Pointer X position in screen pixels
     * @param pointerY - Pointer Y position in screen pixels
     */
    handleWheelZoom: (
        deltaY: number,
        pointerX: number,
        pointerY: number
    ) => void;
}

/**
 * Configuration options for the viewport hook
 */
interface UseCanvasViewportOptions {
    /** Fixed width (optional, defaults to container width) */
    width?: number;
    /** Fixed height (optional, defaults to container height) */
    height?: number;
    /** Minimum zoom level (default: 0.2) */
    minZoom?: number;
    /** Maximum zoom level (default: 5) */
    maxZoom?: number;
}

/**
 * Hook for managing canvas viewport state including dimensions, zoom, pan,
 * and viewport bounds calculation.
 *
 * @param containerRef - Reference to the container DOM element
 * @param options - Configuration options
 * @returns Viewport state and actions
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const {
 *     dimensions,
 *     zoom,
 *     pan,
 *     viewport,
 *     handleWheelZoom,
 * } = useCanvasViewport(containerRef);
 * ```
 */
export function useCanvasViewport(
    containerRef: React.RefObject<HTMLDivElement | null>,
    options: UseCanvasViewportOptions = {}
): ViewportState & ViewportActions {
    const {
        width: fixedWidth,
        height: fixedHeight,
        minZoom = 0.2,
        maxZoom = 5,
    } = options;

    // Local state for container dimensions
    const [dimensions, setDimensions] = useState({
        width: fixedWidth || 800,
        height: fixedHeight || 600,
    });

    // Get zoom/pan state and actions from editor store
    const {
        zoom,
        pan,
        setZoom: storeSetZoom,
        setPan: storePan,
        resetView: storeResetView,
    } = useEditorStore();

    // ========================================
    // Container Resize Handling
    // ========================================
    useEffect(() => {
        // Skip resize handling if fixed dimensions are provided
        if (fixedWidth && fixedHeight) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };

        // Initial measurement
        updateDimensions();

        // Listen for window resize
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [fixedWidth, fixedHeight, containerRef]);

    // ========================================
    // Viewport Bounds Calculation
    // ========================================
    /**
     * Calculate the viewport rectangle in world coordinates.
     * This is used for spatial culling - only rendering elements
     * that are visible in the current view.
     */
    const viewport = useMemo<BoundingBox>(() => ({
        x: -pan.x / zoom,
        y: -pan.y / zoom,
        width: dimensions.width / zoom,
        height: dimensions.height / zoom,
    }), [pan.x, pan.y, zoom, dimensions.width, dimensions.height]);

    // ========================================
    // Zoom Actions
    // ========================================
    /**
     * Set zoom level with clamping to valid range
     */
    const setZoom = useCallback((newZoom: number) => {
        storeSetZoom(Math.max(minZoom, Math.min(maxZoom, newZoom)));
    }, [storeSetZoom, minZoom, maxZoom]);

    // ========================================
    // Pan Actions
    // ========================================
    /**
     * Set pan offset
     */
    const setPan = useCallback((x: number, y: number) => {
        storePan(x, y);
    }, [storePan]);

    // ========================================
    // Reset View
    // ========================================
    /**
     * Reset view to default state (zoom=1, pan=0,0)
     */
    const resetView = useCallback(() => {
        storeResetView();
    }, [storeResetView]);

    // ========================================
    // Wheel Zoom Handler
    // ========================================
    /**
     * Handle wheel zoom - zooms toward the pointer position.
     *
     * The algorithm:
     * 1. Calculate the world position under the pointer
     * 2. Apply the new zoom level
     * 3. Adjust pan so the world position stays under the pointer
     *
     * This creates a natural zoom-toward-cursor effect that users
     * expect from canvas applications.
     */
    const handleWheelZoom = useCallback((
        deltaY: number,
        pointerX: number,
        pointerY: number
    ) => {
        const oldScale = zoom;

        // Calculate world position under pointer
        const mousePointTo = {
            x: (pointerX - pan.x) / oldScale,
            y: (pointerY - pan.y) / oldScale,
        };

        // Determine zoom direction and calculate new scale
        const direction = deltaY > 0 ? -1 : 1;
        const factor = 1.1;
        const newScale = direction > 0 ? oldScale * factor : oldScale / factor;
        const clampedScale = Math.max(minZoom, Math.min(maxZoom, newScale));

        // Apply new zoom and adjust pan to keep mouse point stationary
        setZoom(clampedScale);
        setPan(
            pointerX - mousePointTo.x * clampedScale,
            pointerY - mousePointTo.y * clampedScale
        );
    }, [zoom, pan.x, pan.y, minZoom, maxZoom, setZoom, setPan]);

    return {
        dimensions,
        zoom,
        pan,
        viewport,
        setZoom,
        setPan,
        resetView,
        handleWheelZoom,
    };
}
