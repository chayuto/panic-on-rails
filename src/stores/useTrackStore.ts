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
                } else {
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
                    const endAngle = startRad + angleRad;
                    endPosition = {
                        x: center.x + Math.cos(centerAngle + Math.PI + angleRad) * radius,
                        y: center.y + Math.sin(centerAngle + Math.PI + angleRad) * radius,
                    };
                    endRotation = rotation + angle;
                    length = calculateArcLength(radius, angle);
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

                const edge: TrackEdge = {
                    id: edgeId,
                    partId,
                    startNodeId,
                    endNodeId,
                    geometry: part.geometry.type === 'straight'
                        ? { type: 'straight', start: position, end: endPosition }
                        : {
                            type: 'arc',
                            center: { x: 0, y: 0 }, // Simplified for now
                            radius: part.geometry.radius,
                            startAngle: (rotation * Math.PI) / 180,
                            endAngle: ((rotation + part.geometry.angle) * Math.PI) / 180,
                        },
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
        }),
        {
            name: 'panic-on-rails-v1',
        }
    )
);
