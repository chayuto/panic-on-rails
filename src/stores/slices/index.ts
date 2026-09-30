/**
 * Track Store Slices - Barrel Export
 *
 * What the track store is built from: its slices, its type and the spatial
 * index rebuild.
 */

// Types
export type { TrackStore } from './types';

// Slice Creators
export { createTrackSlice } from './createTrackSlice';
export { createConnectionSlice } from './createConnectionSlice';
export { createViewSlice } from './createViewSlice';

// Spatial Helpers
export { rebuildSpatialIndices } from './spatialHelpers';
export type { BoundingBox } from './spatialHelpers';
