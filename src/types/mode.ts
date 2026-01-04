/**
 * Mode Types for PanicOnRails
 * 
 * Defines the 2-level mode hierarchy:
 * - Primary Mode: 'edit' | 'simulate' - the main application context
 * - Sub-modes: tools within each primary mode
 * 
 * This separation allows:
 * 1. Clear UI visibility rules (show/hide based on primary mode)
 * 2. Tool selection within a mode (e.g., sensor vs signal tool in edit mode)
 * 3. Simplified mode-aware rendering and event handling
 */

// ===========================
// Primary Mode
// ===========================

/**
 * The top-level application mode.
 * 
 * - 'edit': Building and modifying the track layout
 * - 'simulate': Running trains and observing behavior
 */
export type PrimaryMode = 'edit' | 'simulate';

// ===========================
// Edit Mode Sub-Modes
// ===========================

/**
 * Tools available within Edit mode.
 * 
 * - 'select': Default mode for selecting/inspecting tracks and nodes
 * - 'place': Actively placing a track piece (triggered by drag from PartsBin)
 * - 'delete': Click to delete tracks, sensors, signals, or wires
 * - 'sensor': Click on track edges to place sensors
 * - 'signal': Click on nodes to place signals
 * - 'wire': Click to connect logic components with wires
 * - 'connect': Click two endpoints to connect existing tracks
 */
export type EditSubMode =
    | 'select'
    | 'place'
    | 'delete'
    | 'sensor'
    | 'signal'
    | 'wire'
    | 'connect';

// ===========================
// Simulate Mode Sub-Modes
// ===========================

/**
 * Interaction modes within Simulate mode.
 * 
 * - 'observe': Default - watch trains run without interaction
 * - 'interact': Click switches to toggle them, interact with layout
 */
export type SimulateSubMode =
    | 'observe'
    | 'interact';

// ===========================
// Mode State Interface
// ===========================

/**
 * Complete mode state for the application.
 * Used by useModeStore to manage all mode-related state.
 */
export interface ModeState {
    /** Current primary mode (edit or simulate) */
    primaryMode: PrimaryMode;

    /** Current tool within edit mode */
    editSubMode: EditSubMode;

    /** Current interaction mode within simulate mode */
    simulateSubMode: SimulateSubMode;
}

// ===========================
// Default Values
// ===========================

/**
 * Default mode state for a fresh session.
 */
export const DEFAULT_MODE_STATE: ModeState = {
    primaryMode: 'edit',
    editSubMode: 'select',
    simulateSubMode: 'observe',
};

// ===========================
// Type Guards
// ===========================

/**
 * Check if a string is a valid PrimaryMode.
 */
export function isPrimaryMode(value: unknown): value is PrimaryMode {
    return value === 'edit' || value === 'simulate';
}

/**
 * Check if a string is a valid EditSubMode.
 */
export function isEditSubMode(value: unknown): value is EditSubMode {
    return (
        value === 'select' ||
        value === 'place' ||
        value === 'delete' ||
        value === 'sensor' ||
        value === 'signal' ||
        value === 'wire' ||
        value === 'connect'
    );
}

/**
 * Check if a string is a valid SimulateSubMode.
 */
export function isSimulateSubMode(value: unknown): value is SimulateSubMode {
    return value === 'observe' || value === 'interact';
}

// ===========================
// Utility Types
// ===========================

/**
 * Mapping from old EditorMode to new mode hierarchy.
 * Useful for migration and backward compatibility.
 * 
 * @deprecated For migration reference only
 */
export const LEGACY_MODE_MAPPING: Record<string, { primary: PrimaryMode; sub: EditSubMode | SimulateSubMode }> = {
    'edit': { primary: 'edit', sub: 'select' },
    'simulate': { primary: 'simulate', sub: 'observe' },
    'sensor': { primary: 'edit', sub: 'sensor' },
    'signal': { primary: 'edit', sub: 'signal' },
    'wire': { primary: 'edit', sub: 'wire' },
    'delete': { primary: 'edit', sub: 'delete' },
};
