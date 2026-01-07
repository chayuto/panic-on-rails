/**
 * Spatial Index Helpers
 *
 * Manages the spatial hash grids for efficient viewport queries.
 * These are module-level singletons shared across slices.
 */

import type { NodeId, EdgeId, TrackNode, TrackEdge } from '../../types';
import {
    SpatialHashGrid,
    boundingBoxFromPoints,
    boundingBoxFromArc,
    type BoundingBox,
} from '../../utils/spatialHashGrid';

// ===========================
// Spatial Index Singletons
// ===========================

/**
 * Spatial index for edges - used for viewport culling.
 * Cell size of 500 provides good balance for typical track layouts.
 */
export const spatialIndex = new SpatialHashGrid<EdgeId>(500);

/**
 * Spatial index for nodes - used for hit testing and queries.
 */
export const nodeIndex = new SpatialHashGrid<NodeId>(500);

// ===========================
// Bounding Box Calculations
// ===========================

/**
 * Calculate bounding box for a track edge.
 * Adds padding for visual stroke width.
 */
export function getEdgeBounds(edge: TrackEdge): BoundingBox {
    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        return boundingBoxFromPoints(start, end, 5);
    } else {
        const { center, radius, startAngle, endAngle } = edge.geometry;
        return boundingBoxFromArc(center, radius, startAngle, endAngle, 5);
    }
}

/**
 * Calculate bounding box for a node.
 * Uses fixed 20x20 size for hit testing.
 */
export function getNodeBounds(node: TrackNode): BoundingBox {
    return {
        x: node.position.x - 10,
        y: node.position.y - 10,
        width: 20,
        height: 20,
    };
}

// ===========================
// Index Management
// ===========================

/**
 * Rebuild both spatial indices from scratch.
 * Called after layout load or hydration.
 */
export function rebuildSpatialIndices(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>
): void {
    spatialIndex.clear();
    nodeIndex.clear();

    for (const [id, edge] of Object.entries(edges)) {
        const bounds = getEdgeBounds(edge);
        spatialIndex.insert(id, bounds, id);
    }

    for (const [id, node] of Object.entries(nodes)) {
        const bounds = getNodeBounds(node);
        nodeIndex.insert(id, bounds, id);
    }
}

// Re-export BoundingBox type
export type { BoundingBox };
