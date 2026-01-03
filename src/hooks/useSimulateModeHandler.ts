/**
 * useSimulateModeHandler - Hook for simulate-mode canvas interactions
 * 
 * Currently, most simulate-mode logic is handled by:
 * - TrainLayer: Renders trains
 * - TrainPanel: UI for adding/removing trains, play/pause, speed control
 * - TrackLayer: Handles switch clicking in simulate mode
 * - useGameLoop: Runs the physics simulation
 * 
 * This hook provides a thin abstraction layer for any canvas-level
 * simulate mode interactions that may be needed in the future.
 */

import { useCallback } from 'react';
import { useTrackStore } from '../stores/useTrackStore';
import { useIsSimulating } from '../stores/useModeStore';
import { findClosestNode } from '../utils/hitTesting';
import { playSound } from '../utils/audioManager';
import type { Vector2 } from '../types';

interface UseSimulateModeHandlerOptions {
    /** Function to convert screen coordinates to world coordinates */
    screenToWorld: (screenX: number, screenY: number) => Vector2;
}

interface SimulateModeHandlers {
    /** Handle canvas click in simulate mode (e.g., toggle switches) */
    handleCanvasClick: (screenX: number, screenY: number) => void;
}

/**
 * Hook that provides simulate-mode-specific handlers for the canvas
 */
export function useSimulateModeHandler({ screenToWorld }: UseSimulateModeHandlerOptions): SimulateModeHandlers {
    const isSimulating = useIsSimulating();
    const { nodes, toggleSwitch } = useTrackStore();

    /**
     * Handle click on canvas during simulate mode
     * Currently used for clicking on switch nodes to toggle them
     */
    const handleCanvasClick = useCallback((screenX: number, screenY: number) => {
        if (!isSimulating) return;

        const worldPos = screenToWorld(screenX, screenY);

        // Get switch node IDs
        const switchNodeIds = Object.entries(nodes)
            .filter(([, node]) => node.type === 'switch')
            .map(([id]) => id);

        if (switchNodeIds.length === 0) return;

        // Check if click is near a switch node
        const closest = findClosestNode(switchNodeIds, worldPos, nodes, 30); // 30px threshold

        if (closest) {
            toggleSwitch(closest.nodeId);
            playSound('switch');
            console.log('[useSimulateModeHandler] Toggled switch:', closest.nodeId.slice(0, 8));
        }
    }, [isSimulating, screenToWorld, nodes, toggleSwitch]);

    return {
        handleCanvasClick,
    };
}
