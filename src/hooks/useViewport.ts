/**
 * useViewport Hook (R14)
 * 
 * Tracks the current Stage viewport (position and scale).
 * Debounced to prevent excessive re-renders during interactions.
 */

import { useState, useCallback, useMemo, useEffect, RefObject } from 'react';
import type Konva from 'konva';
import type { Viewport } from '../utils/viewportCulling';

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function useViewport(stageRef: RefObject<Konva.Stage>) {
    const [viewport, setViewport] = useState<Viewport | null>(null);

    const updateViewport = useCallback(() => {
        const stage = stageRef.current;
        if (!stage) return;

        setViewport({
            x: stage.x(),
            y: stage.y(),
            width: stage.width(),
            height: stage.height(),
            scale: stage.scaleX(), // Assuming uniform scale
        });
    }, [stageRef]);

    // Update immediately on mount
    useEffect(() => {
        updateViewport();
    }, [updateViewport]);

    // Debounced update for drag/zoom events
    const debouncedUpdate = useMemo(
        // eslint-disable-next-line react-hooks/refs
        () => debounce(updateViewport, 16), // ~60fps
        [updateViewport]
    );

    // Setup listeners if stage is available
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;

        // Update on these events
        stage.on('dragmove', debouncedUpdate);
        stage.on('transform', debouncedUpdate); // covers scale/zoom
        stage.on('wheel', debouncedUpdate); // zoom via wheel often handled manually, but good to catch

        // Also listen for window resize if stage is responsive
        window.addEventListener('resize', debouncedUpdate);

        return () => {
            stage.off('dragmove', debouncedUpdate);
            stage.off('transform', debouncedUpdate);
            stage.off('wheel', debouncedUpdate);
            window.removeEventListener('resize', debouncedUpdate);
        };
    }, [stageRef, debouncedUpdate]);

    // Force update when stage ref becomes available
    useEffect(() => {
        if (stageRef.current && !viewport) {
            updateViewport();
        }
    }, [stageRef, viewport, updateViewport]);

    return { viewport, updateViewport };
}
