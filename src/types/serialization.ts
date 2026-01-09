/**
 * Serialization Types (Save/Load)
 */

import type { NodeId, EdgeId } from './common';
import type { TrackNode, TrackEdge } from './graph';

export interface LayoutData {
    version: number;
    metadata?: {
        name?: string;
        created?: string;
        modified?: string;
        buildTime?: string;  // Build timestamp when app was compiled
    };
    nodes: Record<NodeId, TrackNode>;
    edges: Record<EdgeId, TrackEdge>;
    // Debug info - computed at export time for debugging
    debug?: {
        // Facade angles computed from geometry (not stored rotation)
        facades: Record<NodeId, {
            storedRotation: number;
            // facade angle per connected edge
            edgeFacades: Record<EdgeId, number>;
        }>;
        // Part names for each edge
        partNames: Record<EdgeId, string>;
    };
}
