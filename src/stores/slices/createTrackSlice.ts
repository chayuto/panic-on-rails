/**
 * Track Slice - CRUD Operations
 *
 * Handles creation, deletion, and persistence of track pieces.
 * This is the foundational slice that manages the core graph data.
 *
 * Track creation logic is delegated to specialized creator modules:
 * - switchTrack.ts - Switch/turnout creation
 * - crossingTrack.ts - Crossing/diamond creation
 * - standardTrack.ts - Straight and curve creation
 */

import type {
    NodeId,
    EdgeId,
    TrackNode,
    TrackEdge,
} from '../../types';
import { getPartById } from '../../data/catalog';
import type { SwitchGeometry, CrossingGeometry, StraightGeometry, CurveGeometry } from '../../data/catalog/types';
import { useBudgetStore } from '../useBudgetStore';
import {
    spatialIndex,
    nodeIndex,
    getEdgeBounds,
    getNodeBounds,
    rebuildSpatialIndices,
} from './spatialHelpers';
import type { SliceCreator, TrackSlice } from './types';

// Import track creators
import {
    createSwitchTrack,
    createCrossingTrack,
    createStraightTrack,
    createCurveTrack,
} from './trackCreators';

import { getNodeFacadeFromEdge } from '../../utils/connectTransform';
import { LayoutDataSchema } from '../../schemas/layout';

// Declare build-time constant
declare const __BUILD_TIME__: string;

// Initial state for the track slice
const initialTrackState = {
    nodes: {} as Record<NodeId, TrackNode>,
    edges: {} as Record<EdgeId, TrackEdge>,
};

/**
 * Creates the track slice with CRUD operations.
 */
export const createTrackSlice: SliceCreator<TrackSlice> = (set, get) => ({
    ...initialTrackState,

    addTrack: (partId, position, rotation) => {
        const part = getPartById(partId);
        if (!part) return null;

        // Delegate track creation to specialized creators
        let nodes: TrackNode[];
        let edges: TrackEdge[];
        let primaryEdgeId: EdgeId;

        switch (part.geometry.type) {
            case 'switch': {
                const result = createSwitchTrack(
                    partId,
                    position,
                    rotation,
                    part.geometry as SwitchGeometry
                );
                nodes = result.nodes;
                edges = result.edges;
                primaryEdgeId = result.primaryEdgeId;
                break;
            }
            case 'crossing': {
                const result = createCrossingTrack(
                    partId,
                    position,
                    rotation,
                    part.geometry as CrossingGeometry
                );
                nodes = result.nodes;
                edges = result.edges;
                primaryEdgeId = result.primaryEdgeId;
                break;
            }
            case 'curve': {
                const result = createCurveTrack(
                    partId,
                    position,
                    rotation,
                    part.geometry as CurveGeometry
                );
                nodes = result.nodes;
                edges = result.edges;
                primaryEdgeId = result.primaryEdgeId;
                break;
            }
            case 'straight': {
                const result = createStraightTrack(
                    partId,
                    position,
                    rotation,
                    part.geometry as StraightGeometry
                );
                nodes = result.nodes;
                edges = result.edges;
                primaryEdgeId = result.primaryEdgeId;
                break;
            }
            default:
                console.warn('Unsupported geometry type:', (part.geometry as { type: string }).type);
                return null;
        }

        // Update spatial indices for all created entities
        for (const edge of edges) {
            spatialIndex.insert(edge.id, getEdgeBounds(edge), edge.id);
        }
        for (const node of nodes) {
            nodeIndex.insert(node.id, getNodeBounds(node), node.id);
        }

        // Update store state
        set((state) => {
            const newNodes = { ...state.nodes };
            const newEdges = { ...state.edges };

            for (const node of nodes) {
                newNodes[node.id] = node;
            }
            for (const edge of edges) {
                newEdges[edge.id] = edge;
            }

            return { nodes: newNodes, edges: newEdges };
        });

        return primaryEdgeId;
    },

    removeTrack: (edgeId) => {
        // Remove from spatial index first
        spatialIndex.remove(edgeId);

        set((state) => {
            const edge = state.edges[edgeId];
            if (!edge) return state;

            const newNodes = { ...state.nodes };
            const newEdges = { ...state.edges };

            // Remove edge
            delete newEdges[edgeId];

            // Clean up orphaned nodes
            [edge.startNodeId, edge.endNodeId].forEach((nodeId) => {
                const node = newNodes[nodeId];
                if (node) {
                    node.connections = node.connections.filter((id) => id !== edgeId);
                    if (node.connections.length === 0) {
                        delete newNodes[nodeId];
                        nodeIndex.remove(nodeId);
                    }
                }
            });

            return { nodes: newNodes, edges: newEdges };
        });
    },

    loadLayout: (rawData: unknown) => {
        const result = LayoutDataSchema.safeParse(rawData);

        if (!result.success) {
            console.error('Invalid layout data:', result.error);
            throw new Error(`Invalid layout: ${result.error.issues[0]?.message}`);
        }

        const data = result.data;

        // Explicit cast to ensure compatibility with store types
        const nodes = data.nodes as Record<NodeId, TrackNode>;
        const edges = data.edges as Record<EdgeId, TrackEdge>;
        // Rebuild spatial indices with loaded data
        rebuildSpatialIndices(nodes, edges);

        set({
            nodes: nodes,
            edges: edges,
        });
    },
    clearLayout: () => {
        console.log('[useTrackStore] clearLayout() called');

        // Reset budget (refund all spending)
        console.log('[useTrackStore] Resetting budget...');
        useBudgetStore.getState().reset();

        // Clear spatial indices
        console.log('[useTrackStore] Clearing spatial indices...');
        spatialIndex.clear();
        nodeIndex.clear();

        console.log('[useTrackStore] Setting initial state...');
        set(initialTrackState);
        console.log('[useTrackStore] ✅ clearLayout() completed');
    },

    getLayout: () => {
        const state = get();

        // Compute debug info: facade angles per node-edge pair
        const facades: Record<NodeId, { storedRotation: number; edgeFacades: Record<EdgeId, number> }> = {};
        const partNames: Record<EdgeId, string> = {};

        // Get part names for each edge
        for (const [edgeId, edge] of Object.entries(state.edges)) {
            const part = getPartById(edge.partId);
            partNames[edgeId] = part?.name || edge.partId;
        }

        // Compute facade angles for each node-edge pair
        for (const [nodeId, node] of Object.entries(state.nodes)) {
            const edgeFacades: Record<EdgeId, number> = {};

            for (const edgeId of node.connections) {
                const edge = state.edges[edgeId];
                if (edge) {
                    edgeFacades[edgeId] = getNodeFacadeFromEdge(nodeId, edge);
                }
            }

            facades[nodeId] = {
                storedRotation: node.rotation,
                edgeFacades,
            };
        }

        return {
            version: 1,
            metadata: {
                modified: new Date().toISOString(),
                buildTime: __BUILD_TIME__,
            },
            nodes: state.nodes,
            edges: state.edges,
            debug: {
                facades,
                partNames,
            },
        };
    },

    getOpenEndpoints: () => {
        const state = get();
        // Open endpoints are nodes with only 1 connection (one open side)
        return Object.values(state.nodes).filter(
            node => node.connections.length === 1
        );
    },
});

// Re-export initial state for use in store setup
export { initialTrackState };
