/**
 * Track Store Slices - Barrel Export
 *
 * Re-exports all slice types and creators for clean imports.
 */

// Types
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
} from './types';

// Slice Creators
export { createTrackSlice, initialTrackState } from './createTrackSlice';
export { createConnectionSlice } from './createConnectionSlice';
export { createViewSlice } from './createViewSlice';

// Spatial Helpers
export {
    spatialIndex,
    nodeIndex,
    getEdgeBounds,
    getNodeBounds,
    rebuildSpatialIndices,
} from './spatialHelpers';
export type { BoundingBox } from './spatialHelpers';
