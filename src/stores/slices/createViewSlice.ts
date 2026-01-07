/**
 * View Slice - Spatial Queries
 *
 * Handles viewport-based queries for efficient rendering.
 * Uses spatial hash grids for O(1) lookups.
 */

import type { EdgeId, NodeId } from '../../types';
import { spatialIndex, nodeIndex, type BoundingBox } from './spatialHelpers';
import type { SliceCreator, ViewSlice } from './types';

/**
 * Creates the view slice with spatial query operations.
 */
export const createViewSlice: SliceCreator<ViewSlice> = () => ({
    /**
     * Query for visible edges within a viewport rectangle.
     * Uses spatial hash grid for O(1) performance.
     */
    getVisibleEdges: (viewport: BoundingBox): EdgeId[] => {
        return spatialIndex.queryIds(viewport);
    },

    /**
     * Query for visible nodes within a viewport rectangle.
     * Uses spatial hash grid for O(1) performance.
     */
    getVisibleNodes: (viewport: BoundingBox): NodeId[] => {
        return nodeIndex.queryIds(viewport);
    },
});
