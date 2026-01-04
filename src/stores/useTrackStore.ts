import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
    NodeId,
    EdgeId,
    TrackNode,
    TrackEdge,
    LayoutData,
    Vector2,
    PartId
} from '../types';
import { getPartById, calculateArcLength } from '../data/catalog';
import { useBudgetStore } from './useBudgetStore';
import {
    SpatialHashGrid,
    boundingBoxFromPoints,
    boundingBoxFromArc,
    type BoundingBox
} from '../utils/spatialHashGrid';

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
}

interface TrackState {
    nodes: Record<NodeId, TrackNode>;
    edges: Record<EdgeId, TrackEdge>;
}

interface TrackActions {
    addTrack: (partId: PartId, position: Vector2, rotation: number) => EdgeId | null;
    removeTrack: (edgeId: EdgeId) => void;
    loadLayout: (data: LayoutData) => void;
    clearLayout: () => void;
    getLayout: () => LayoutData;
    getOpenEndpoints: () => TrackNode[];
    connectNodes: (survivorNodeId: NodeId, removedNodeId: NodeId, newEdgeId: EdgeId) => void;
    toggleSwitch: (nodeId: NodeId) => void;
    // New spatial query actions
    getVisibleEdges: (viewport: BoundingBox) => EdgeId[];
    getVisibleNodes: (viewport: BoundingBox) => NodeId[];
}

// Non-persisted runtime state - spatial index is rebuilt on hydration
const spatialIndex = new SpatialHashGrid<EdgeId>(500);
const nodeIndex = new SpatialHashGrid<NodeId>(500);

/**
 * Calculate bounding box for a track edge
 */
function getEdgeBounds(edge: TrackEdge): BoundingBox {
    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        return boundingBoxFromPoints(start, end, 5);
    } else {
        // Arc geometry
        const { center, radius, startAngle, endAngle } = edge.geometry;
        return boundingBoxFromArc(center, radius, startAngle, endAngle, 5);
    }
}

/**
 * Calculate bounding box for a node (small circle)
 */
function getNodeBounds(node: TrackNode): BoundingBox {
    return {
        x: node.position.x - 10,
        y: node.position.y - 10,
        width: 20,
        height: 20,
    };
}

/**
 * Rebuild spatial indices from state
 */
function rebuildSpatialIndices(nodes: Record<NodeId, TrackNode>, edges: Record<EdgeId, TrackEdge>): void {
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

const initialState: TrackState = {
    nodes: {},
    edges: {},
};

export const useTrackStore = create<TrackState & TrackActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            addTrack: (partId, position, rotation) => {
                const part = getPartById(partId);
                if (!part) return null;

                // For switch geometry, we create 3 nodes and 2 edges
                if (part.geometry.type === 'switch') {
                    const { mainLength, branchLength, branchAngle, branchDirection } = part.geometry;

                    // Generate IDs
                    const entryNodeId = uuidv4();
                    const mainExitNodeId = uuidv4();
                    const branchExitNodeId = uuidv4();
                    const mainEdgeId = uuidv4();
                    const branchEdgeId = uuidv4();

                    const radians = (rotation * Math.PI) / 180;

                    // Calculate main exit position (straight through)
                    const mainExitPosition: Vector2 = {
                        x: position.x + Math.cos(radians) * mainLength,
                        y: position.y + Math.sin(radians) * mainLength,
                    };

                    // Calculate branch exit position (diverging)
                    const branchAngleDir = branchDirection === 'left' ? -1 : 1;
                    const branchRadians = radians + (branchAngleDir * branchAngle * Math.PI / 180);
                    const branchExitPosition: Vector2 = {
                        x: position.x + Math.cos(branchRadians) * branchLength,
                        y: position.y + Math.sin(branchRadians) * branchLength,
                    };

                    // Create nodes
                    const entryNode: TrackNode = {
                        id: entryNodeId,
                        position,
                        rotation: normalizeAngle(rotation + 180), // Facing backwards for connection
                        connections: [mainEdgeId, branchEdgeId],
                        type: 'switch',
                        switchState: 0, // Default to main path
                        switchBranches: [mainEdgeId, branchEdgeId],
                    };

                    const mainExitNode: TrackNode = {
                        id: mainExitNodeId,
                        position: mainExitPosition,
                        rotation: normalizeAngle(rotation),
                        connections: [mainEdgeId],
                        type: 'endpoint',
                    };

                    const branchExitNode: TrackNode = {
                        id: branchExitNodeId,
                        position: branchExitPosition,
                        rotation: normalizeAngle(rotation + (branchAngleDir * branchAngle)),
                        connections: [branchEdgeId],
                        type: 'endpoint',
                    };

                    // Create edges
                    const mainEdge: TrackEdge = {
                        id: mainEdgeId,
                        partId,
                        startNodeId: entryNodeId,
                        endNodeId: mainExitNodeId,
                        geometry: { type: 'straight', start: position, end: mainExitPosition },
                        length: mainLength,
                    };

                    const branchEdge: TrackEdge = {
                        id: branchEdgeId,
                        partId,
                        startNodeId: entryNodeId,
                        endNodeId: branchExitNodeId,
                        geometry: { type: 'straight', start: position, end: branchExitPosition },
                        length: branchLength,
                    };

                    // Update spatial index for new edges
                    spatialIndex.insert(mainEdgeId, getEdgeBounds(mainEdge), mainEdgeId);
                    spatialIndex.insert(branchEdgeId, getEdgeBounds(branchEdge), branchEdgeId);

                    // Update spatial index for new nodes
                    nodeIndex.insert(entryNodeId, getNodeBounds(entryNode), entryNodeId);
                    nodeIndex.insert(mainExitNodeId, getNodeBounds(mainExitNode), mainExitNodeId);
                    nodeIndex.insert(branchExitNodeId, getNodeBounds(branchExitNode), branchExitNodeId);

                    set((state) => ({
                        nodes: {
                            ...state.nodes,
                            [entryNodeId]: entryNode,
                            [mainExitNodeId]: mainExitNode,
                            [branchExitNodeId]: branchExitNode,
                        },
                        edges: {
                            ...state.edges,
                            [mainEdgeId]: mainEdge,
                            [branchEdgeId]: branchEdge,
                        },
                    }));

                    // Return the main edge ID as the primary identifier
                    return mainEdgeId;
                }

                if ((part.geometry as any).type === 'crossing') {
                    // Crossing geometry: Two straight tracks crossing at the center
                    // Cast to any to avoid "Property 'type' does not exist on type 'never'" error
                    const { length, crossingAngle } = part.geometry as import('../data/catalog/types').CrossingGeometry;
                    const halfLength = length / 2;
                    const radians = (rotation * Math.PI) / 180;

                    // Main track (Path A) - follows placement position/rotation
                    const endPosition = {
                        x: position.x + Math.cos(radians) * length,
                        y: position.y + Math.sin(radians) * length,
                    };

                    // Calculate Center Point (intersection)
                    const center: Vector2 = {
                        x: position.x + Math.cos(radians) * halfLength,
                        y: position.y + Math.sin(radians) * halfLength,
                    };

                    // Cross track (Path B) - rotated by crossingAngle relative to main
                    const crossRadians = radians + (crossingAngle * Math.PI / 180);

                    // Calculate Start/End for Cross Track
                    // Start is half-length BACKWARDS from center
                    const crossStart: Vector2 = {
                        x: center.x - Math.cos(crossRadians) * halfLength,
                        y: center.y - Math.sin(crossRadians) * halfLength,
                    };

                    const crossEnd: Vector2 = {
                        x: center.x + Math.cos(crossRadians) * halfLength,
                        y: center.y + Math.sin(crossRadians) * halfLength,
                    };

                    // Generate IDs
                    const mainEdgeId = uuidv4();
                    const crossEdgeId = uuidv4();
                    const mainStartNodeId = uuidv4();
                    const mainEndNodeId = uuidv4();
                    const crossStartNodeId = uuidv4();
                    const crossEndNodeId = uuidv4();

                    // Create Nodes
                    const mainStartNode: TrackNode = {
                        id: mainStartNodeId,
                        position,
                        rotation: normalizeAngle(rotation + 180),
                        connections: [mainEdgeId],
                        type: 'endpoint'
                    };
                    const mainEndNode: TrackNode = {
                        id: mainEndNodeId,
                        position: endPosition,
                        rotation: normalizeAngle(rotation),
                        connections: [mainEdgeId],
                        type: 'endpoint'
                    };

                    const crossStartNode: TrackNode = {
                        id: crossStartNodeId,
                        position: crossStart,
                        rotation: normalizeAngle(rotation + crossingAngle + 180),
                        connections: [crossEdgeId],
                        type: 'endpoint'
                    };
                    const crossEndNode: TrackNode = {
                        id: crossEndNodeId,
                        position: crossEnd,
                        rotation: normalizeAngle(rotation + crossingAngle),
                        connections: [crossEdgeId],
                        type: 'endpoint'
                    };

                    // Create Edges
                    const mainEdge: TrackEdge = {
                        id: mainEdgeId,
                        partId,
                        startNodeId: mainStartNodeId,
                        endNodeId: mainEndNodeId,
                        geometry: { type: 'straight', start: position, end: endPosition },
                        length
                    };

                    const crossEdge: TrackEdge = {
                        id: crossEdgeId,
                        partId,
                        startNodeId: crossStartNodeId,
                        endNodeId: crossEndNodeId,
                        geometry: { type: 'straight', start: crossStart, end: crossEnd },
                        length
                    };

                    // Update indices
                    spatialIndex.insert(mainEdgeId, getEdgeBounds(mainEdge), mainEdgeId);
                    spatialIndex.insert(crossEdgeId, getEdgeBounds(crossEdge), crossEdgeId);
                    nodeIndex.insert(mainStartNodeId, getNodeBounds(mainStartNode), mainStartNodeId);
                    nodeIndex.insert(mainEndNodeId, getNodeBounds(mainEndNode), mainEndNodeId);
                    nodeIndex.insert(crossStartNodeId, getNodeBounds(crossStartNode), crossStartNodeId);
                    nodeIndex.insert(crossEndNodeId, getNodeBounds(crossEndNode), crossEndNodeId);

                    // Update state
                    set((state) => ({
                        nodes: {
                            ...state.nodes,
                            [mainStartNodeId]: mainStartNode,
                            [mainEndNodeId]: mainEndNode,
                            [crossStartNodeId]: crossStartNode,
                            [crossEndNodeId]: crossEndNode,
                        },
                        edges: {
                            ...state.edges,
                            [mainEdgeId]: mainEdge,
                            [crossEdgeId]: crossEdge,
                        },
                    }));

                    return mainEdgeId;
                }

                // Standard track handling (straight/curve)
                const edgeId = uuidv4();
                const startNodeId = uuidv4();
                const endNodeId = uuidv4();

                let endPosition: Vector2;
                let endRotation: number;
                let length: number;

                if (part.geometry.type === 'straight') {
                    // Calculate end position for straight track
                    const radians = (rotation * Math.PI) / 180;
                    endPosition = {
                        x: position.x + Math.cos(radians) * part.geometry.length,
                        y: position.y + Math.sin(radians) * part.geometry.length,
                    };
                    endRotation = rotation;
                    length = part.geometry.length;
                } else if (part.geometry.type === 'curve') {
                    // Calculate end position for curved track
                    const { radius, angle } = part.geometry;
                    const angleRad = (angle * Math.PI) / 180;
                    const startRad = (rotation * Math.PI) / 180;

                    // Arc center is perpendicular to start direction
                    const centerAngle = startRad - Math.PI / 2; // Left curve by default
                    const center: Vector2 = {
                        x: position.x + Math.cos(centerAngle) * radius,
                        y: position.y + Math.sin(centerAngle) * radius,
                    };

                    // End position on the arc
                    endPosition = {
                        x: center.x + Math.cos(centerAngle + Math.PI + angleRad) * radius,
                        y: center.y + Math.sin(centerAngle + Math.PI + angleRad) * radius,
                    };
                    endRotation = rotation + angle;
                    length = calculateArcLength(radius, angle);
                } else {
                    // crossing geometry not yet supported
                    console.warn(`Unsupported geometry type: ${part.geometry.type}`);
                    return null;
                }

                const startNode: TrackNode = {
                    id: startNodeId,
                    position,
                    rotation: normalizeAngle(rotation + 180), // Facing backwards for connection
                    connections: [edgeId],
                    type: 'endpoint',
                };

                const endNode: TrackNode = {
                    id: endNodeId,
                    position: endPosition,
                    rotation: normalizeAngle(endRotation),
                    connections: [edgeId],
                    type: 'endpoint',
                };

                // Build edge geometry based on part type
                let edgeGeometry: TrackEdge['geometry'];
                if (part.geometry.type === 'straight') {
                    edgeGeometry = { type: 'straight', start: position, end: endPosition };
                } else if (part.geometry.type === 'curve') {
                    // Calculate arc center (perpendicular left from start direction)
                    const startRad = (rotation * Math.PI) / 180;
                    const centerAngle = startRad - Math.PI / 2;  // Left curve: center is 90deg CCW from direction
                    const arcCenter = {
                        x: position.x + Math.cos(centerAngle) * part.geometry.radius,
                        y: position.y + Math.sin(centerAngle) * part.geometry.radius,
                    };

                    // Arc angles are measured FROM THE CENTER TO THE ARC ENDPOINTS
                    // Start point is at angle (centerAngle + PI) from center (opposite direction)
                    // End point is at angle (centerAngle + PI + arcSweep) from center
                    const arcStartAngle = centerAngle + Math.PI;  // Angle from center to start point
                    const arcSweep = (part.geometry.angle * Math.PI) / 180;  // Arc sweep in radians

                    edgeGeometry = {
                        type: 'arc',
                        center: arcCenter,
                        radius: part.geometry.radius,
                        startAngle: arcStartAngle,
                        endAngle: arcStartAngle + arcSweep,
                    };
                } else {
                    // Should never reach here due to early return above
                    return null;
                }

                const edge: TrackEdge = {
                    id: edgeId,
                    partId,
                    startNodeId,
                    endNodeId,
                    geometry: edgeGeometry,
                    length,
                };

                // Update spatial index for new edge and nodes
                spatialIndex.insert(edgeId, getEdgeBounds(edge), edgeId);
                nodeIndex.insert(startNodeId, getNodeBounds(startNode), startNodeId);
                nodeIndex.insert(endNodeId, getNodeBounds(endNode), endNodeId);

                set((state) => ({
                    nodes: {
                        ...state.nodes,
                        [startNodeId]: startNode,
                        [endNodeId]: endNode,
                    },
                    edges: {
                        ...state.edges,
                        [edgeId]: edge,
                    },
                }));

                return edgeId;
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

            loadLayout: (data) => {
                // Rebuild spatial indices with loaded data
                rebuildSpatialIndices(data.nodes, data.edges);

                set({
                    nodes: data.nodes,
                    edges: data.edges,
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
                set(initialState);
                console.log('[useTrackStore] ✅ clearLayout() completed');
            },

            getLayout: () => {
                const state = get();
                return {
                    version: 1,
                    metadata: {
                        modified: new Date().toISOString(),
                        buildTime: __BUILD_TIME__,
                    },
                    nodes: state.nodes,
                    edges: state.edges,
                };
            },

            getOpenEndpoints: () => {
                const state = get();
                // Open endpoints are nodes with only 1 connection (one open side)
                return Object.values(state.nodes).filter(
                    node => node.connections.length === 1
                );
            },

            /**
             * Connect two nodes by merging them.
             * The "removedNode" is deleted and all its edge references transfer to "survivorNode".
             * 
             * @param survivorNodeId - The existing node that will remain
             * @param removedNodeId - The new track's node that will be merged/deleted
             * @param newEdgeId - The new track's edge that needs updating
             */
            connectNodes: (survivorNodeId, removedNodeId, newEdgeId) => {
                console.log('[connectNodes] Starting node merge:', {
                    survivorNodeId: survivorNodeId.slice(0, 8),
                    removedNodeId: removedNodeId.slice(0, 8),
                    newEdgeId: newEdgeId.slice(0, 8),
                });

                set((state) => {
                    const survivorNode = state.nodes[survivorNodeId];
                    const removedNode = state.nodes[removedNodeId];

                    if (!survivorNode || !removedNode) {
                        console.warn('[connectNodes] Node not found:', {
                            survivorExists: !!survivorNode,
                            removedExists: !!removedNode,
                        });
                        return state;
                    }

                    console.log('[connectNodes] Nodes found:', {
                        survivorConnections: survivorNode.connections.length,
                        removedConnections: removedNode.connections.length,
                    });

                    const newNodes = { ...state.nodes };
                    const newEdges = { ...state.edges };

                    // Update the new edge to point to survivor instead of removed node
                    const newEdge = newEdges[newEdgeId];
                    if (newEdge) {
                        if (newEdge.startNodeId === removedNodeId) {
                            newEdges[newEdgeId] = { ...newEdge, startNodeId: survivorNodeId };
                        } else if (newEdge.endNodeId === removedNodeId) {
                            newEdges[newEdgeId] = { ...newEdge, endNodeId: survivorNodeId };
                        }
                    }

                    // Add the new edge connection to survivor
                    newNodes[survivorNodeId] = {
                        ...survivorNode,
                        connections: [...survivorNode.connections, newEdgeId],
                        // Upgrade to junction if now has 2+ connections
                        type: survivorNode.connections.length >= 1 ? 'junction' : 'endpoint',
                    };

                    // Delete the removed node and remove from spatial index
                    delete newNodes[removedNodeId];
                    nodeIndex.remove(removedNodeId);

                    console.log('[connectNodes] Merge complete:', {
                        totalNodes: Object.keys(newNodes).length,
                        totalEdges: Object.keys(newEdges).length,
                        survivorConnectionsNow: newNodes[survivorNodeId].connections.length,
                    });

                    return { nodes: newNodes, edges: newEdges };
                });
            },

            /**
             * Toggle a switch between its two branch states.
             */
            toggleSwitch: (nodeId) => {
                set((state) => {
                    const node = state.nodes[nodeId];
                    if (!node || node.type !== 'switch') {
                        console.warn('[toggleSwitch] Node is not a switch:', nodeId.slice(0, 8));
                        return state;
                    }

                    const newState: 0 | 1 = node.switchState === 0 ? 1 : 0;
                    console.log('[toggleSwitch] Toggling switch:', {
                        nodeId: nodeId.slice(0, 8),
                        from: node.switchState,
                        to: newState,
                    });

                    return {
                        nodes: {
                            ...state.nodes,
                            [nodeId]: {
                                ...node,
                                switchState: newState,
                            },
                        },
                    };
                });
            },

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
        }),
        {
            name: 'panic-on-rails-v1',
            // Rebuild spatial indices after hydration
            onRehydrateStorage: () => (state) => {
                if (state) {
                    rebuildSpatialIndices(state.nodes, state.edges);
                    console.log('[useTrackStore] Spatial indices rebuilt after hydration');
                }
            },
        }
    )
);

// Export helper functions for use in other components
export { getEdgeBounds, getNodeBounds };
export type { BoundingBox };
