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
import { normalizeAngle } from '../utils/geometry';
import { getNodeFacadeFromEdge } from '../utils/connectTransform';

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
    // Connect mode actions
    movePart: (edgeId: EdgeId, pivotNodeId: NodeId, targetPosition: Vector2, rotationDelta: number) => void;
    /** 
     * V2: Atomic connect operation - combines movePart + connectNodes into single state update.
     * Moves the target network to align with anchor node, then merges the nodes.
     */
    connectNetworks: (
        anchorNodeId: NodeId,
        movingNodeId: NodeId,
        movingEdgeId: EdgeId,
        rotationDelta: number
    ) => void;
    // Spatial query actions
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

// ===========================
// Geometry Sync Layer
// ===========================

/**
 * Sync edge geometry to match node positions.
 * 
 * This is a critical safety layer that ensures geometry never desyncs from nodes.
 * Call this after any mutation that changes node positions.
 * 
 * For straight edges: geometry.start/end must match node positions
 * For arc edges: we verify endpoints match (arc center is more complex to sync)
 * 
 * @param nodes - Current node state
 * @param edges - Current edge state  
 * @returns New edges object with synced geometry
 */
function syncGeometryToNodes(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>
): Record<EdgeId, TrackEdge> {
    const syncedEdges: Record<EdgeId, TrackEdge> = {};

    for (const [id, edge] of Object.entries(edges)) {
        const startNode = nodes[edge.startNodeId];
        const endNode = nodes[edge.endNodeId];

        if (!startNode || !endNode) {
            // Node missing - keep edge as-is (will fail validation)
            syncedEdges[id] = edge;
            continue;
        }

        if (edge.geometry.type === 'straight') {
            // For straight: always sync to node positions
            syncedEdges[id] = {
                ...edge,
                geometry: {
                    type: 'straight',
                    start: { ...startNode.position },
                    end: { ...endNode.position },
                }
            };
        } else {
            // For arc: geometry uses center + angles
            // The endpoints SHOULD match nodes - if not, log a warning
            // Full arc recalculation is complex, so we trust movePart did it correctly
            // but we validate the endpoints match
            const { center, radius, startAngle, endAngle } = edge.geometry;
            const expectedStart = {
                x: center.x + radius * Math.cos(startAngle * Math.PI / 180),
                y: center.y + radius * Math.sin(startAngle * Math.PI / 180),
            };
            const expectedEnd = {
                x: center.x + radius * Math.cos(endAngle * Math.PI / 180),
                y: center.y + radius * Math.sin(endAngle * Math.PI / 180),
            };

            const startDist = Math.hypot(expectedStart.x - startNode.position.x, expectedStart.y - startNode.position.y);
            const endDist = Math.hypot(expectedEnd.x - endNode.position.x, expectedEnd.y - endNode.position.y);

            // Allow 1px tolerance for floating point
            if (startDist > 1 || endDist > 1) {
                console.warn('[syncGeometry] Arc endpoints mismatch:', {
                    edgeId: id.slice(0, 8),
                    startDist: startDist.toFixed(2),
                    endDist: endDist.toFixed(2),
                });
            }

            syncedEdges[id] = edge;
        }
    }

    return syncedEdges;
}

/**
 * Validate layout integrity - check for data corruption.
 * 
 * Call this in development to catch bugs early.
 * Returns list of error messages (empty = valid).
 */
function validateLayoutIntegrity(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>
): string[] {
    const errors: string[] = [];

    // Check 1: All edges reference existing nodes
    for (const [edgeId, edge] of Object.entries(edges)) {
        if (!nodes[edge.startNodeId]) {
            errors.push(`Edge ${edgeId.slice(0, 8)} references missing startNode ${edge.startNodeId.slice(0, 8)}`);
        }
        if (!nodes[edge.endNodeId]) {
            errors.push(`Edge ${edgeId.slice(0, 8)} references missing endNode ${edge.endNodeId.slice(0, 8)}`);
        }
    }

    // Check 2: All node connections reference existing edges
    for (const [nodeId, node] of Object.entries(nodes)) {
        for (const edgeId of node.connections) {
            if (!edges[edgeId]) {
                errors.push(`Node ${nodeId.slice(0, 8)} references missing edge ${edgeId.slice(0, 8)}`);
            }
        }
    }

    // Check 3: Straight edge geometry matches node positions
    for (const [edgeId, edge] of Object.entries(edges)) {
        if (edge.geometry.type === 'straight') {
            const startNode = nodes[edge.startNodeId];
            const endNode = nodes[edge.endNodeId];

            if (startNode && endNode) {
                const startDist = Math.hypot(
                    edge.geometry.start.x - startNode.position.x,
                    edge.geometry.start.y - startNode.position.y
                );
                const endDist = Math.hypot(
                    edge.geometry.end.x - endNode.position.x,
                    edge.geometry.end.y - endNode.position.y
                );

                if (startDist > 0.1) {
                    errors.push(`Edge ${edgeId.slice(0, 8)} geometry.start doesn't match startNode (diff: ${startDist.toFixed(2)}px)`);
                }
                if (endDist > 0.1) {
                    errors.push(`Edge ${edgeId.slice(0, 8)} geometry.end doesn't match endNode (diff: ${endDist.toFixed(2)}px)`);
                }
            }
        }
    }

    // Check 4: Node types match connection count
    for (const [nodeId, node] of Object.entries(nodes)) {
        const connCount = node.connections.length;
        if (node.type === 'endpoint' && connCount !== 1) {
            errors.push(`Endpoint ${nodeId.slice(0, 8)} has ${connCount} connections (expected 1)`);
        }
        if (node.type === 'junction' && connCount < 2) {
            errors.push(`Junction ${nodeId.slice(0, 8)} has ${connCount} connections (expected 2+)`);
        }
    }

    if (errors.length > 0) {
        console.warn('[validateLayoutIntegrity] Found issues:', errors);
    }

    return errors;
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
                        intrinsicGeometry: { type: 'straight', length: mainLength },
                    };

                    const branchEdge: TrackEdge = {
                        id: branchEdgeId,
                        partId,
                        startNodeId: entryNodeId,
                        endNodeId: branchExitNodeId,
                        geometry: { type: 'straight', start: position, end: branchExitPosition },
                        length: branchLength,
                        intrinsicGeometry: { type: 'straight', length: branchLength },
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

                if ((part.geometry as { type: string }).type === 'crossing') {
                    // Crossing geometry: Two straight tracks crossing at the center
                    const crossingGeom = part.geometry as import('../data/catalog/types').CrossingGeometry;
                    const { length, crossingAngle } = crossingGeom;
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
                        length,
                        intrinsicGeometry: { type: 'straight', length },
                    };

                    const crossEdge: TrackEdge = {
                        id: crossEdgeId,
                        partId,
                        startNodeId: crossStartNodeId,
                        endNodeId: crossEndNodeId,
                        geometry: { type: 'straight', start: crossStart, end: crossEnd },
                        length,
                        intrinsicGeometry: { type: 'straight', length },
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
                    // Other geometry types not yet supported in standard track handling
                    console.warn('Unsupported geometry type for standard track placement');
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
                    // Use radians ONLY for cos/sin calculation
                    const centerAngleDeg = rotation - 90;  // Left curve: center is 90° CCW from direction
                    const centerAngleRad = (centerAngleDeg * Math.PI) / 180;
                    const arcCenter = {
                        x: position.x + Math.cos(centerAngleRad) * part.geometry.radius,
                        y: position.y + Math.sin(centerAngleRad) * part.geometry.radius,
                    };

                    // Arc angles stored in DEGREES per constitution
                    // Start point is at angle (centerAngle + 180°) from center
                    // End point is at angle (startAngle + curveAngle) from center
                    const arcStartAngleDeg = normalizeAngle(centerAngleDeg + 180);
                    const arcSweepDeg = part.geometry.angle;  // Already in degrees from catalog

                    edgeGeometry = {
                        type: 'arc',
                        center: arcCenter,
                        radius: part.geometry.radius,
                        startAngle: arcStartAngleDeg,
                        endAngle: arcStartAngleDeg + arcSweepDeg,  // May exceed 360°
                    };
                } else {
                    // Should never reach here due to early return above
                    return null;
                }

                // Build intrinsic geometry for V2
                const intrinsicGeometry = part.geometry.type === 'straight'
                    ? { type: 'straight' as const, length: part.geometry.length }
                    : part.geometry.type === 'curve'
                        ? {
                            type: 'arc' as const,
                            radius: part.geometry.radius,
                            sweepAngle: part.geometry.angle,
                            direction: 'ccw' as const,  // Current curves are CCW (left-hand)
                        }
                        : undefined;

                const edge: TrackEdge = {
                    id: edgeId,
                    partId,
                    startNodeId,
                    endNodeId,
                    geometry: edgeGeometry,
                    length,
                    intrinsicGeometry,
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
                    // CRITICAL: Also update geometry to match the new node position
                    const newEdge = newEdges[newEdgeId];
                    if (newEdge) {
                        const survivorPos = newNodes[survivorNodeId].position;

                        if (newEdge.startNodeId === removedNodeId) {
                            // Update reference and sync geometry
                            let updatedGeometry = newEdge.geometry;
                            if (newEdge.geometry.type === 'straight') {
                                updatedGeometry = { ...newEdge.geometry, start: survivorPos };
                            }
                            // For arcs: geometry uses center + angles, endpoints are derived
                            // The arc geometry should already be correct from movePart

                            newEdges[newEdgeId] = {
                                ...newEdge,
                                startNodeId: survivorNodeId,
                                geometry: updatedGeometry
                            };
                        } else if (newEdge.endNodeId === removedNodeId) {
                            let updatedGeometry = newEdge.geometry;
                            if (newEdge.geometry.type === 'straight') {
                                updatedGeometry = { ...newEdge.geometry, end: survivorPos };
                            }

                            newEdges[newEdgeId] = {
                                ...newEdge,
                                endNodeId: survivorNodeId,
                                geometry: updatedGeometry
                            };
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
             * V2: Atomic connect operation - combines movePart + connectNodes into single state update.
             * 
             * This ensures connection is fully atomic - either everything succeeds or nothing changes.
             * Eliminates the fragile two-step movePart() + connectNodes() pattern.
             * 
             * @param anchorNodeId - The fixed node (Part A) that the moving network connects to
             * @param movingNodeId - The node (Part B) that will be moved and merged
             * @param movingEdgeId - Any edge from Part B (used to identify the network)
             * @param rotationDelta - Rotation needed to align facades (degrees)
             */
            connectNetworks: (anchorNodeId, movingNodeId, movingEdgeId, rotationDelta) => {
                console.log('[connectNetworks] Starting atomic connect:', {
                    anchorNodeId: anchorNodeId.slice(0, 8),
                    movingNodeId: movingNodeId.slice(0, 8),
                    movingEdgeId: movingEdgeId.slice(0, 8),
                    rotationDelta,
                });

                set((state) => {
                    // Validate nodes exist
                    const anchorNode = state.nodes[anchorNodeId];
                    const movingNode = state.nodes[movingNodeId];

                    if (!anchorNode || !movingNode) {
                        console.warn('[connectNetworks] Node not found:', {
                            anchorExists: !!anchorNode,
                            movingExists: !!movingNode,
                        });
                        return state;
                    }

                    // STEP 1: Find all nodes/edges in the moving network using BFS
                    const networkNodeIds = new Set<NodeId>();
                    const networkEdgeIds = new Set<EdgeId>();
                    const queue: NodeId[] = [movingNodeId];

                    while (queue.length > 0) {
                        const currentNodeId = queue.shift()!;
                        if (networkNodeIds.has(currentNodeId)) continue;

                        const currentNode = state.nodes[currentNodeId];
                        if (!currentNode) continue;

                        networkNodeIds.add(currentNodeId);

                        for (const connEdgeId of currentNode.connections) {
                            if (networkEdgeIds.has(connEdgeId)) continue;

                            const connEdge = state.edges[connEdgeId];
                            if (!connEdge) continue;

                            networkEdgeIds.add(connEdgeId);

                            const otherNodeId = connEdge.startNodeId === currentNodeId
                                ? connEdge.endNodeId
                                : connEdge.startNodeId;

                            if (!networkNodeIds.has(otherNodeId)) {
                                queue.push(otherNodeId);
                            }
                        }
                    }

                    console.log('[connectNetworks] Network found:', {
                        nodes: networkNodeIds.size,
                        edges: networkEdgeIds.size,
                    });

                    // STEP 2: Calculate transform (rotation around pivot + translation to anchor)
                    const pivotPos = movingNode.position;
                    const targetPos = anchorNode.position;
                    const radDelta = (rotationDelta * Math.PI) / 180;
                    const cos = Math.cos(radDelta);
                    const sin = Math.sin(radDelta);

                    const translation = {
                        x: targetPos.x - pivotPos.x,
                        y: targetPos.y - pivotPos.y,
                    };

                    const transformPos = (pos: Vector2): Vector2 => {
                        const dx = pos.x - pivotPos.x;
                        const dy = pos.y - pivotPos.y;
                        const rotatedX = dx * cos - dy * sin;
                        const rotatedY = dx * sin + dy * cos;
                        return {
                            x: pivotPos.x + rotatedX + translation.x,
                            y: pivotPos.y + rotatedY + translation.y,
                        };
                    };

                    // STEP 3: Transform all nodes in network
                    const newNodes = { ...state.nodes };
                    const newEdges = { ...state.edges };

                    for (const nodeId of networkNodeIds) {
                        const node = state.nodes[nodeId];
                        if (!node) continue;

                        const newPosition = transformPos(node.position);
                        const newRotation = normalizeAngle(node.rotation + rotationDelta);

                        newNodes[nodeId] = {
                            ...node,
                            position: newPosition,
                            rotation: newRotation,
                        };

                        // Update spatial index
                        nodeIndex.remove(nodeId);
                        nodeIndex.insert(nodeId, getNodeBounds(newNodes[nodeId]), nodeId);
                    }

                    // STEP 4: Transform all edges in network (update geometry)
                    for (const edgeId of networkEdgeIds) {
                        const e = state.edges[edgeId];
                        if (!e) continue;

                        const startNode = newNodes[e.startNodeId];
                        const endNode = newNodes[e.endNodeId];
                        if (!startNode || !endNode) continue;

                        let newGeometry: TrackEdge['geometry'];

                        if (e.geometry.type === 'straight') {
                            newGeometry = {
                                type: 'straight',
                                start: startNode.position,
                                end: endNode.position,
                            };
                        } else {
                            // Arc geometry - transform center and angles
                            const oldCenter = e.geometry.center;
                            const newCenter = transformPos(oldCenter);
                            const newStartAngle = normalizeAngle(e.geometry.startAngle + rotationDelta);
                            const arcSweep = e.geometry.endAngle - e.geometry.startAngle;

                            newGeometry = {
                                type: 'arc',
                                center: newCenter,
                                radius: e.geometry.radius,
                                startAngle: newStartAngle,
                                endAngle: newStartAngle + arcSweep,
                            };
                        }

                        newEdges[edgeId] = {
                            ...e,
                            geometry: newGeometry,
                        };

                        // Update spatial index for edge
                        spatialIndex.remove(edgeId);
                        spatialIndex.insert(edgeId, getEdgeBounds(newEdges[edgeId]), edgeId);
                    }

                    // STEP 5: Merge nodes (movingNode into anchorNode)
                    const movingEdge = newEdges[movingEdgeId];
                    if (movingEdge) {
                        if (movingEdge.startNodeId === movingNodeId) {
                            let updatedGeometry = movingEdge.geometry;
                            if (movingEdge.geometry.type === 'straight') {
                                updatedGeometry = { ...movingEdge.geometry, start: anchorNode.position };
                            }
                            newEdges[movingEdgeId] = {
                                ...movingEdge,
                                startNodeId: anchorNodeId,
                                geometry: updatedGeometry,
                            };
                        } else if (movingEdge.endNodeId === movingNodeId) {
                            let updatedGeometry = movingEdge.geometry;
                            if (movingEdge.geometry.type === 'straight') {
                                updatedGeometry = { ...movingEdge.geometry, end: anchorNode.position };
                            }
                            newEdges[movingEdgeId] = {
                                ...movingEdge,
                                endNodeId: anchorNodeId,
                                geometry: updatedGeometry,
                            };
                        }
                    }

                    // Add edge connection to anchor and upgrade type
                    newNodes[anchorNodeId] = {
                        ...newNodes[anchorNodeId],
                        connections: [...newNodes[anchorNodeId].connections, movingEdgeId],
                        type: newNodes[anchorNodeId].connections.length >= 1 ? 'junction' : 'endpoint',
                    };

                    // Delete moving node
                    delete newNodes[movingNodeId];
                    nodeIndex.remove(movingNodeId);

                    console.log('[connectNetworks] Atomic connect complete:', {
                        totalNodes: Object.keys(newNodes).length,
                        totalEdges: Object.keys(newEdges).length,
                        anchorConnectionsNow: newNodes[anchorNodeId].connections.length,
                    });

                    // Run validation in dev mode
                    if (import.meta.env.DEV) {
                        const errors = validateLayoutIntegrity(newNodes, newEdges);
                        if (errors.length > 0) {
                            console.error('[connectNetworks] Layout integrity errors:', errors);
                        }
                    }

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
             * Move a part to a new position by rotating around a pivot node.
             * Used by Connect Mode to reposition Part B to connect to Part A.
             * 
             * @param edgeId - Any edge belonging to the part to move
             * @param pivotNodeId - The node that will end up at targetPosition
             * @param targetPosition - Where the pivot node should end up
             * @param rotationDelta - Additional rotation to apply (degrees)
             */
            movePart: (edgeId, pivotNodeId, targetPosition, rotationDelta) => {
                console.log('[movePart] Starting part move:', {
                    edgeId: edgeId.slice(0, 8),
                    pivotNodeId: pivotNodeId.slice(0, 8),
                    targetPosition,
                    rotationDelta,
                });

                set((state) => {
                    const edge = state.edges[edgeId];
                    if (!edge) {
                        console.warn('[movePart] Edge not found');
                        return state;
                    }

                    // Find ALL nodes and edges in the connected network from pivot node using BFS
                    // This ensures the entire connected set moves together, not just the single part
                    const networkNodeIds = new Set<NodeId>();
                    const networkEdgeIds = new Set<EdgeId>();
                    const queue: NodeId[] = [pivotNodeId];

                    while (queue.length > 0) {
                        const currentNodeId = queue.shift()!;
                        if (networkNodeIds.has(currentNodeId)) continue;

                        const currentNode = state.nodes[currentNodeId];
                        if (!currentNode) continue;

                        networkNodeIds.add(currentNodeId);

                        // Traverse all connected edges
                        for (const connEdgeId of currentNode.connections) {
                            if (networkEdgeIds.has(connEdgeId)) continue;

                            const connEdge = state.edges[connEdgeId];
                            if (!connEdge) continue;

                            networkEdgeIds.add(connEdgeId);

                            // Add the other node of this edge to the queue
                            const otherNodeId = connEdge.startNodeId === currentNodeId
                                ? connEdge.endNodeId
                                : connEdge.startNodeId;

                            if (!networkNodeIds.has(otherNodeId)) {
                                queue.push(otherNodeId);
                            }
                        }
                    }

                    // Get the edges as array for transformation
                    const networkEdges = Array.from(networkEdgeIds).map(id => state.edges[id]).filter(Boolean);

                    // Get pivot node current position
                    const pivotNode = state.nodes[pivotNodeId];
                    if (!pivotNode) {
                        console.warn('[movePart] Pivot node not found');
                        return state;
                    }

                    const pivotPos = pivotNode.position;
                    const radDelta = (rotationDelta * Math.PI) / 180;
                    const cos = Math.cos(radDelta);
                    const sin = Math.sin(radDelta);

                    // Calculate translation: after rotation, pivot should be at target
                    // newPivotPos = pivot (because rotation is around pivot)
                    // translation = targetPosition - pivotPos
                    const translation = {
                        x: targetPosition.x - pivotPos.x,
                        y: targetPosition.y - pivotPos.y,
                    };

                    // Helper to transform a position
                    const transformPos = (pos: Vector2): Vector2 => {
                        // Rotate around pivot
                        const dx = pos.x - pivotPos.x;
                        const dy = pos.y - pivotPos.y;
                        const rotatedX = dx * cos - dy * sin;
                        const rotatedY = dx * sin + dy * cos;
                        // Translate
                        return {
                            x: pivotPos.x + rotatedX + translation.x,
                            y: pivotPos.y + rotatedY + translation.y,
                        };
                    };

                    const newNodes = { ...state.nodes };
                    const newEdges = { ...state.edges };

                    // Transform all nodes
                    for (const nodeId of networkNodeIds) {
                        const node = state.nodes[nodeId];
                        if (!node) continue;

                        const newPosition = transformPos(node.position);
                        const newRotation = normalizeAngle(node.rotation + rotationDelta);

                        newNodes[nodeId] = {
                            ...node,
                            position: newPosition,
                            rotation: newRotation,
                        };

                        // Update spatial index
                        nodeIndex.remove(nodeId);
                        nodeIndex.insert(nodeId, getNodeBounds(newNodes[nodeId]), nodeId);
                    }

                    // Transform all edges (update geometry)
                    for (const e of networkEdges) {
                        const startNode = newNodes[e.startNodeId];
                        const endNode = newNodes[e.endNodeId];

                        if (!startNode || !endNode) continue;

                        let newGeometry: TrackEdge['geometry'];

                        if (e.geometry.type === 'straight') {
                            newGeometry = {
                                type: 'straight',
                                start: startNode.position,
                                end: endNode.position,
                            };
                        } else {
                            // Arc geometry - transform center and angles (in degrees)
                            const oldCenter = e.geometry.center;
                            const newCenter = transformPos(oldCenter);

                            // Angles are stored in degrees per constitution
                            const newStartAngle = normalizeAngle(e.geometry.startAngle + rotationDelta);
                            // Preserve arc sweep by adding same delta (may exceed 360°)
                            const arcSweep = e.geometry.endAngle - e.geometry.startAngle;
                            const newEndAngle = newStartAngle + arcSweep;

                            newGeometry = {
                                type: 'arc',
                                center: newCenter,
                                radius: e.geometry.radius,
                                startAngle: newStartAngle,
                                endAngle: newEndAngle,
                            };
                        }

                        newEdges[e.id] = {
                            ...e,
                            geometry: newGeometry,
                        };

                        // Update spatial index
                        spatialIndex.remove(e.id);
                        spatialIndex.insert(e.id, getEdgeBounds(newEdges[e.id]), e.id);
                    }

                    console.log('[movePart] Move complete:', {
                        nodesTransformed: networkNodeIds.size,
                        edgesTransformed: networkEdges.length,
                    });

                    // Sync geometry to ensure consistency (safety layer)
                    const syncedEdges = syncGeometryToNodes(newNodes, newEdges);

                    // Validate in development
                    if (import.meta.env.DEV) {
                        const errors = validateLayoutIntegrity(newNodes, syncedEdges);
                        if (errors.length > 0) {
                            console.error('[movePart] Layout integrity errors after move:', errors);
                        }
                    }

                    return { nodes: newNodes, edges: syncedEdges };
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
            // Rebuild spatial indices after hydration and migrate legacy data
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // MIGRATION: Fix angles (radian -> degree) for legacy data
                    // If we see very small effective sweeps for large radius arcs, it's likely radians
                    let migratedCount = 0;

                    Object.values(state.edges).forEach(edge => {
                        if (edge.geometry.type === 'arc') {
                            const sweep = Math.abs(edge.geometry.endAngle - edge.geometry.startAngle);
                            // Heuristic: If sweep is < 15 degrees and radius > 50mm, it's likely radians (PI/2 = 1.57)
                            // Standard curves are usually 45 or 90 degrees.
                            // Even the smallest likely curve (15 deg) is much larger than 2PI (6.28)
                            if (sweep < 15 && edge.geometry.radius > 50) {
                                edge.geometry.startAngle = (edge.geometry.startAngle * 180) / Math.PI;
                                edge.geometry.endAngle = (edge.geometry.endAngle * 180) / Math.PI;
                                migratedCount++;
                            }
                        }
                    });

                    if (migratedCount > 0) {
                        console.log(`[useTrackStore] Migrated ${migratedCount} legacy arcs from radians to degrees`);
                    }

                    // V2 MIGRATION: Add intrinsicGeometry to edges that don't have it
                    let v2MigratedCount = 0;
                    for (const [edgeId, edge] of Object.entries(state.edges)) {
                        if (!edge.intrinsicGeometry) {
                            if (edge.geometry.type === 'straight') {
                                // Calculate length from geometry
                                const dx = edge.geometry.end.x - edge.geometry.start.x;
                                const dy = edge.geometry.end.y - edge.geometry.start.y;
                                const length = Math.sqrt(dx * dx + dy * dy);

                                state.edges[edgeId] = {
                                    ...edge,
                                    intrinsicGeometry: { type: 'straight', length },
                                };
                                v2MigratedCount++;
                            } else if (edge.geometry.type === 'arc') {
                                // Calculate sweep angle from start/end angles
                                const sweepAngle = Math.abs(edge.geometry.endAngle - edge.geometry.startAngle);
                                // Determine direction: if endAngle > startAngle, it's CCW
                                const direction: 'cw' | 'ccw' =
                                    edge.geometry.endAngle > edge.geometry.startAngle ? 'ccw' : 'cw';

                                state.edges[edgeId] = {
                                    ...edge,
                                    intrinsicGeometry: {
                                        type: 'arc',
                                        radius: edge.geometry.radius,
                                        sweepAngle,
                                        direction,
                                    },
                                };
                                v2MigratedCount++;
                            }
                        }
                    }

                    if (v2MigratedCount > 0) {
                        console.log(`[V2 Migration] Added intrinsicGeometry to ${v2MigratedCount} edges`);
                    }

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
