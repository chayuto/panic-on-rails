/**
 * useKeyboardShortcuts - Centralized keyboard shortcut handler
 * 
 * Mode-aware shortcuts:
 * - M: Toggle between Edit/Simulate modes
 * - 1-6: Switch edit sub-modes (Edit mode only)
 * - Space: Play/Pause (Simulate mode only)
 * - +/-: Speed control (Simulate mode only)
 * - R/Shift+R: Rotate (handled in StageWrapper during drag)
 */

import { useEffect } from 'react';
import { useModeStore } from '../stores/useModeStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import type { EditSubMode } from '../types/mode';

// Map number keys to edit sub-modes
const EDIT_MODE_SHORTCUTS: Record<string, EditSubMode> = {
    '1': 'select',
    '2': 'place',
    '3': 'delete',
    '4': 'sensor',
    '5': 'signal',
    '6': 'wire',
};

export function useKeyboardShortcuts() {
    const { primaryMode, togglePrimaryMode, setEditSubMode } = useModeStore();
    const { isRunning, toggleRunning, speedMultiplier, setSpeedMultiplier } = useSimulationStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input field
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                e.target instanceof HTMLSelectElement
            ) {
                return;
            }

            const key = e.key.toLowerCase();
            const isEditing = primaryMode === 'edit';
            const isSimulating = primaryMode === 'simulate';

            // Mode toggle - works in both modes
            if (key === 'm') {
                e.preventDefault();
                togglePrimaryMode();
                return;
            }

            // Edit mode shortcuts
            if (isEditing) {
                // Number keys for sub-mode selection
                if (EDIT_MODE_SHORTCUTS[key]) {
                    e.preventDefault();
                    setEditSubMode(EDIT_MODE_SHORTCUTS[key]);
                    return;
                }
            }

            // Simulate mode shortcuts
            if (isSimulating) {
                // Space: Play/Pause
                if (key === ' ') {
                    e.preventDefault();
                    toggleRunning();
                    return;
                }

                // +/=: Increase speed
                if (key === '=' || key === '+') {
                    e.preventDefault();
                    setSpeedMultiplier(Math.min(3, speedMultiplier + 0.5));
                    return;
                }

                // -: Decrease speed
                if (key === '-') {
                    e.preventDefault();
                    setSpeedMultiplier(Math.max(0.1, speedMultiplier - 0.5));
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        primaryMode,
        togglePrimaryMode,
        setEditSubMode,
        isRunning,
        toggleRunning,
        speedMultiplier,
        setSpeedMultiplier,
    ]);
}
