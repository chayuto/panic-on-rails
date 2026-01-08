/**
 * useSwitchInteraction - Hook for switch interaction during simulation
 * 
 * Provides:
 * - Keyboard shortcuts for toggling switches
 * - Safety check to prevent toggling while train is on switch
 * - Hover state tracking for switch nodes
 */

import { useEffect, useCallback } from 'react';
import { useTrackStore } from '../stores/useTrackStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useIsSimulating } from '../stores/useModeStore';
import { useEffectsStore } from '../stores/useEffectsStore';
import { playSwitchSound, playSound } from '../utils/audioManager';
import type { NodeId } from '../types';

/**
 * Check if any train is currently on or near a switch node.
 * Returns true if a train is on any edge connected to the switch.
 */
function isTrainOnSwitch(
    switchNodeId: NodeId,
    trains: Record<string, { currentEdgeId: string; crashed?: boolean }>,
    edges: Record<string, { startNodeId: string; endNodeId: string }>
): boolean {
    // Find all edges connected to this switch
    const connectedEdgeIds = Object.entries(edges)
        .filter(([, edge]) =>
            edge.startNodeId === switchNodeId || edge.endNodeId === switchNodeId
        )
        .map(([id]) => id);

    // Check if any non-crashed train is on a connected edge
    return Object.values(trains).some(train =>
        !train.crashed && connectedEdgeIds.includes(train.currentEdgeId)
    );
}

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
    const { nodes, edges, toggleSwitch } = useTrackStore();
    const { trains } = useSimulationStore();
    const { hoveredSwitchId, triggerRipple } = useEffectsStore();

    /**
     * Safely toggle a switch, checking if a train is on it first.
     * Returns true if toggle succeeded, false if blocked.
     */
    const safeToggleSwitch = useCallback((nodeId: NodeId): boolean => {
        const node = nodes[nodeId];
        if (!node || node.type !== 'switch') {
            console.warn('[useSwitchInteraction] Not a switch node:', nodeId);
            return false;
        }

        // Safety check: don't toggle if train is on switch
        if (isTrainOnSwitch(nodeId, trains, edges)) {
            console.log('[useSwitchInteraction] Blocked: train on switch', nodeId.slice(0, 8));
            playSound('bounce');  // Error/blocked sound
            return false;
        }

        // Perform toggle
        toggleSwitch(nodeId);
        playSwitchSound('n-scale');

        // Trigger visual effect
        if (node.position) {
            triggerRipple(node.position, { color: '#FFD93D' });
        }

        return true;
    }, [nodes, edges, trains, toggleSwitch, triggerRipple]);

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
                const switches = Object.values(nodes)
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
    }, [enableKeyboard, isSimulating, hoveredSwitchId, nodes, safeToggleSwitch]);

    return {
        safeToggleSwitch,
        hoveredSwitchId,
    };
}
