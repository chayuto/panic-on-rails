/**
 * useSwitchInteraction - Hook for switch interaction during simulation
 * 
 * Provides:
 * - Keyboard shortcuts for toggling switches
 * - The points' lock: refused while a train is on them (utils/points)
 * - Hover state tracking for switch nodes
 */

import { useEffect, useCallback } from 'react';
import { useTrackStore } from '../stores/useTrackStore';
import { useIsSimulating } from '../stores/useModeStore';
import { useEffectsStore } from '../stores/useEffectsStore';
import type { NodeId } from '../types';
import { throwPoints } from '../utils/points';

interface UseSwitchInteractionOptions {
    /** Whether to enable keyboard shortcuts */
    enableKeyboard?: boolean;
}

interface SwitchInteractionResult {
    /** Safely toggle a switch with train check */
    safeToggleSwitch: (nodeId: NodeId) => boolean;
    /** Current hovered switch ID */
    hoveredSwitchId: string | null;
}

/**
 * Hook for switch interaction with safety checks and keyboard shortcuts.
 */
export function useSwitchInteraction(
    options: UseSwitchInteractionOptions = {}
): SwitchInteractionResult {
    const { enableKeyboard = true } = options;

    const isSimulating = useIsSimulating();
    const hoveredSwitchId = useEffectsStore(s => s.hoveredSwitchId);

    /** Throw the points, unless a train is on them. Returns whether they moved. */
    const safeToggleSwitch = useCallback((nodeId: NodeId): boolean => throwPoints(nodeId), []);

    // Keyboard shortcuts for switch control
    useEffect(() => {
        if (!enableKeyboard || !isSimulating) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if (e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement) {
                return;
            }

            // 'S' key toggles hovered switch
            if (e.key.toLowerCase() === 's' && hoveredSwitchId) {
                e.preventDefault();
                safeToggleSwitch(hoveredSwitchId);
                return;
            }

            // Number keys 1-9 toggle switches by index
            const num = parseInt(e.key);
            if (num >= 1 && num <= 9) {
                const switches = Object.values(useTrackStore.getState().nodes)
                    .filter(n => n.type === 'switch')
                    .sort((a, b) => a.id.localeCompare(b.id));  // Consistent ordering

                if (switches[num - 1]) {
                    e.preventDefault();
                    safeToggleSwitch(switches[num - 1].id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enableKeyboard, isSimulating, hoveredSwitchId, safeToggleSwitch]);

    return {
        safeToggleSwitch,
        hoveredSwitchId,
    };
}
