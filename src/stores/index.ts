/**
 * Stores - Barrel Export
 *
 * Re-exports all Zustand stores for clean imports.
 */

// Track store (main store)
export { useTrackStore, getEdgeBounds, getNodeBounds, type BoundingBox } from './useTrackStore';

// Mode management
export { useModeStore, useIsEditing, useIsSimulating, useEditSubMode } from './useModeStore';

// Simulation
export { useSimulationStore, DEFAULT_CARRIAGE_SPACING } from './useSimulationStore';

// Budget
export { useBudgetStore } from './useBudgetStore';

// Editor
export { useEditorStore } from './useEditorStore';

// Logic
export { useLogicStore } from './useLogicStore';

// Slice types (for advanced usage)
export type {
    TrackSliceState,
    TrackSliceActions,
    TrackSlice,
    ConnectionSliceActions,
    ConnectionSlice,
    ViewSliceActions,
    ViewSlice,
    TrackStore,
    SliceCreator,
} from './slices';
