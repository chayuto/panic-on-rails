/**
 * Shared Types for Track Store Slices
 *
 * This file defines the interfaces that each slice contributes to the combined store.
 * Each slice has its own State and Actions interface.
 *
 * @see https://docs.pmnd.rs/zustand/guides/slices-pattern
 */

import type { StateCreator } from 'zustand';
import type {
    NodeId,
    EdgeId,
    TrackNode,
    TrackEdge,
    LayoutData,
    Vector2,
    PartId,
} from '../../types';
import type { BoundingBox } from '../../utils/spatialHashGrid';

// ===========================
// Track Slice (CRUD Operations)
// ===========================

export interface TrackSliceState {
    nodes: Record<NodeId, TrackNode>;
    edges: Record<EdgeId, TrackEdge>;
}

export interface TrackSliceActions {
    addTrack: (partId: PartId, position: Vector2, rotation: number) => EdgeId | null;
    removeTrack: (edgeId: EdgeId) => void;
    loadLayout: (data: LayoutData) => void;
    clearLayout: () => void;
    getLayout: () => LayoutData;
    getOpenEndpoints: () => TrackNode[];
}

export type TrackSlice = TrackSliceState & TrackSliceActions;

// ===========================
// Connection Slice (Network Operations)
// ===========================

export interface ConnectionSliceActions {
    connectNodes: (survivorNodeId: NodeId, removedNodeId: NodeId, newEdgeId: EdgeId) => void;
    connectNetworks: (
        anchorNodeId: NodeId,
        movingNodeId: NodeId,
        movingEdgeId: EdgeId,
        rotationDelta: number
    ) => void;
    movePart: (
        edgeId: EdgeId,
        pivotNodeId: NodeId,
        targetPosition: Vector2,
        rotationDelta: number
    ) => void;
    toggleSwitch: (nodeId: NodeId) => void;
}

export type ConnectionSlice = ConnectionSliceActions;

// ===========================
// View Slice (Spatial Queries)
// ===========================

export interface ViewSliceActions {
    getVisibleEdges: (viewport: BoundingBox) => EdgeId[];
    getVisibleNodes: (viewport: BoundingBox) => NodeId[];
}

export type ViewSlice = ViewSliceActions;

// ===========================
// Combined Store Type
// ===========================

/**
 * The complete track store type, combining all slices.
 * This is what consumers of useTrackStore will see.
 */
export type TrackStore = TrackSlice & ConnectionSlice & ViewSlice;

// ===========================
// Slice Creator Types
// ===========================

/**
 * Type for creating a slice that has access to the full store.
 *
 * @template T - The slice's own type (state + actions)
 *
 * Usage:
 * ```typescript
 * const createMySlice: SliceCreator<MySlice> = (set, get) => ({
 *   // slice implementation
 * });
 * ```
 */
export type SliceCreator<T> = StateCreator<
    TrackStore,
    [],
    [],
    T
>;
