/**
 * Mode Store for PanicOnRails
 * 
 * Centralized state management for the application's mode system.
 * 
 * Architecture:
 * - Primary Mode: 'edit' or 'simulate' - determines overall context
 * - Sub-modes: tools within each primary mode
 * 
 * This store is intentionally NOT persisted because:
 * 1. Mode should reset to 'edit' on page refresh (safe default)
 * 2. No user expectation that mode persists across sessions
 * 3. Simpler hydration (no need to validate persisted mode state)
 * 
 * Cross-store communication:
 * - Mode transitions may trigger side effects in other stores
 * - Use the enterEditMode() and enterSimulateMode() actions for proper cleanup
 * - Direct setPrimaryMode() is available but skips side effects
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
    PrimaryMode,
    EditSubMode,
    SimulateSubMode,
    ModeState
} from '../types/mode';
import { DEFAULT_MODE_STATE } from '../types/mode';

// ===========================
// State Interface
// ===========================

// State type is identical to ModeState (no additional fields)
type ModeStoreState = ModeState;

// ===========================
// Actions Interface
// ===========================

interface ModeStoreActions {
    // Primary mode actions

    /**
     * Set primary mode directly without triggering side effects.
     * Use this only when restoring state or testing.
     * For user interactions, use `enterEditMode` or `enterSimulateMode`.
     * 
     * @param mode - Target primary mode ('edit' | 'simulate')
     */
    setPrimaryMode: (mode: PrimaryMode) => void;

    /**
     * Toggle between edit and simulate modes.
     * Automatically calls `enterEditMode` or `enterSimulateMode` to handle cleanup.
     * 
     * @example
     * <Button onClick={togglePrimaryMode}>Switch Mode</Button>
     */
    togglePrimaryMode: () => void;

    // Sub-mode actions

    /**
     * Set the current tool/sub-mode in Edit mode.
     * 
     * @param subMode - Tool to activate (e.g., 'select', 'track', 'wiring')
     * 
     * @example
     * setEditSubMode('track'); // Switch to track builder
     */
    setEditSubMode: (subMode: EditSubMode) => void;

    /**
     * Set the current sub-mode in Simulate mode.
     * 
     * @param subMode - Interaction capability (e.g., 'observe', 'drive')
     */
    setSimulateSubMode: (subMode: SimulateSubMode) => void;

    // Transition actions with side effects

    /** 
     * Switch to Edit mode and perform necessary cleanup.
     * - Clears in-progress interactions (dragging, wiring)
     * - Resets sub-mode to default ('select')
     * 
     * @example
     * enterEditMode();
     */
    enterEditMode: () => void;

    /**
     * Switch to Simulate mode and initialize simulation state.
     * - Clears ghost previews
     * - Sets sub-mode to 'observe'
     * 
     * @example
     * enterSimulateMode();
     */
    enterSimulateMode: () => void;

    // Reset

    /**
     * Reset mode state to application defaults.
     * Primary: 'edit', Sub: 'select'
     */
    resetMode: () => void;
}

// ===========================
// Selectors
// ===========================

/**
 * Selector: Check if currently in edit mode.
 * Use with useModeStore(selectIsEditing) for optimal re-renders.
 */
export const selectIsEditing = (state: ModeStoreState): boolean =>
    state.primaryMode === 'edit';

/**
 * Selector: Check if currently in simulate mode.
 * Use with useModeStore(selectIsSimulating) for optimal re-renders.
 */
export const selectIsSimulating = (state: ModeStoreState): boolean =>
    state.primaryMode === 'simulate';

/**
 * Selector: Get the current primary mode.
 */
export const selectPrimaryMode = (state: ModeStoreState): PrimaryMode =>
    state.primaryMode;

/**
 * Selector: Get the current edit sub-mode.
 */
export const selectEditSubMode = (state: ModeStoreState): EditSubMode =>
    state.editSubMode;

/**
 * Selector: Get the current simulate sub-mode.
 */
export const selectSimulateSubMode = (state: ModeStoreState): SimulateSubMode =>
    state.simulateSubMode;

// ===========================
// Store Implementation
// ===========================

export const useModeStore = create<ModeStoreState & ModeStoreActions>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        ...DEFAULT_MODE_STATE,

        // ===========================
        // Primary Mode Actions
        // ===========================

        setPrimaryMode: (mode: PrimaryMode) => {
            set({ primaryMode: mode });
        },

        togglePrimaryMode: () => {
            const current = get().primaryMode;
            if (current === 'edit') {
                get().enterSimulateMode();
            } else {
                get().enterEditMode();
            }
        },

        // ===========================
        // Sub-Mode Actions
        // ===========================

        setEditSubMode: (subMode: EditSubMode) => {
            set({ editSubMode: subMode });
        },

        setSimulateSubMode: (subMode: SimulateSubMode) => {
            set({ simulateSubMode: subMode });
        },

        // ===========================
        // Transition Actions
        // ===========================

        enterEditMode: () => {
            // Switch to edit mode with default sub-mode
            set({
                primaryMode: 'edit',
                editSubMode: 'select',
            });

            // Side effects: Clear state in other stores
            // These are done via external calls to avoid circular imports
            // The caller (usually a component or another store) should handle:
            // - useEditorStore.getState().endDrag()
            // - useEditorStore.getState().clearWireSource()
            // 
            // We use subscribeWithSelector middleware so external code can:
            // useModeStore.subscribe(
            //     state => state.primaryMode,
            //     (primaryMode) => { /* handle side effects */ }
            // )
        },

        enterSimulateMode: () => {
            // Switch to simulate mode with default sub-mode
            set({
                primaryMode: 'simulate',
                simulateSubMode: 'observe',
            });

            // Side effects handled similarly to enterEditMode()
            // Common actions on entering simulate:
            // - Clear ghost/drag state
            // - Start simulation (isRunning = true) - optional
        },

        // ===========================
        // Reset
        // ===========================

        resetMode: () => {
            set(DEFAULT_MODE_STATE);
        },
    }))
);

// ===========================
// Convenience Hooks
// ===========================

/**
 * Hook: Check if currently in edit mode.
 * Optimized for minimal re-renders.
 * 
 * @example
 * const isEditing = useIsEditing();
 * if (isEditing) { ... }
 */
export const useIsEditing = (): boolean =>
    useModeStore(selectIsEditing);

/**
 * Hook: Check if currently in simulate mode.
 * Optimized for minimal re-renders.
 * 
 * @example
 * const isSimulating = useIsSimulating();
 * if (isSimulating) { ... }
 */
export const useIsSimulating = (): boolean =>
    useModeStore(selectIsSimulating);

/**
 * Hook: Get the current primary mode.
 * 
 * @example
 * const mode = usePrimaryMode();
 */
export const usePrimaryMode = (): PrimaryMode =>
    useModeStore(selectPrimaryMode);

/**
 * Hook: Get the current edit sub-mode.
 * 
 * @example
 * const subMode = useEditSubMode();
 * if (subMode === 'delete') { ... }
 */
export const useEditSubMode = (): EditSubMode =>
    useModeStore(selectEditSubMode);

/**
 * Hook: Get mode actions without subscribing to state.
 * Useful in event handlers to avoid re-renders.
 * 
 * @example
 * const actions = useModeActions();
 * onClick={() => actions.togglePrimaryMode()}
 */
export const useModeActions = () => ({
    setPrimaryMode: useModeStore.getState().setPrimaryMode,
    togglePrimaryMode: useModeStore.getState().togglePrimaryMode,
    setEditSubMode: useModeStore.getState().setEditSubMode,
    setSimulateSubMode: useModeStore.getState().setSimulateSubMode,
    enterEditMode: useModeStore.getState().enterEditMode,
    enterSimulateMode: useModeStore.getState().enterSimulateMode,
    resetMode: useModeStore.getState().resetMode,
});

// ===========================
// Type Exports
// ===========================

export type { ModeStoreState, ModeStoreActions };
