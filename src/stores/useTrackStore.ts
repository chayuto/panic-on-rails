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
                    // Switch/crossing geometry not yet supported
                    console.warn(`Unsupported geometry type: ${part.geometry.type}`);
                    return null;
                }

                const startNode: TrackNode = {
                    id: startNodeId,
                    position,
                    rotation: rotation + 180, // Facing backwards for connection
                    connections: [edgeId],
                    type: 'endpoint',
                };

                const endNode: TrackNode = {
                    id: endNodeId,
                    position: endPosition,
                    rotation: endRotation,
                    connections: [edgeId],
                    type: 'endpoint',
                };

                // Build edge geometry based on part type
                let edgeGeometry: TrackEdge['geometry'];
                if (part.geometry.type === 'straight') {
                    edgeGeometry = { type: 'straight', start: position, end: endPosition };
                } else if (part.geometry.type === 'curve') {
                    edgeGeometry = {
                        type: 'arc',
                        center: { x: 0, y: 0 }, // Simplified for now
                        radius: part.geometry.radius,
                        startAngle: (rotation * Math.PI) / 180,
                        endAngle: ((rotation + part.geometry.angle) * Math.PI) / 180,
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
                            }
                        }
                    });

                    return { nodes: newNodes, edges: newEdges };
                });
            },

            loadLayout: (data) => {
                set({
                    nodes: data.nodes,
                    edges: data.edges,
                });
            },

            clearLayout: () => {
                set(initialState);
            },

            getLayout: () => {
                const state = get();
                return {
                    version: 1,
                    metadata: {
                        modified: new Date().toISOString(),
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
                set((state) => {
                    const survivorNode = state.nodes[survivorNodeId];
                    const removedNode = state.nodes[removedNodeId];

                    if (!survivorNode || !removedNode) return state;

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

                    // Delete the removed node
                    delete newNodes[removedNodeId];

                    return { nodes: newNodes, edges: newEdges };
                });
            },
        }),
        {
            name: 'panic-on-rails-v1',
        }
    )
);
