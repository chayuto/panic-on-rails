/**
 * Track Slice - CRUD Operations
 *
 * Handles creation, deletion, and persistence of track pieces.
 * This is the foundational slice that manages the core graph data.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
    NodeId,
    EdgeId,
    TrackNode,
    TrackEdge,
    Vector2,
} from '../../types';
import { getPartById, calculateArcLength } from '../../data/catalog';
import { useBudgetStore } from '../useBudgetStore';
import { normalizeAngle } from '../../utils/geometry';
import { getNodeFacadeFromEdge } from '../../utils/connectTransform';
import {
    spatialIndex,
    nodeIndex,
    getEdgeBounds,
    getNodeBounds,
    rebuildSpatialIndices,
} from './spatialHelpers';
import type { SliceCreator, TrackSlice } from './types';

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

        // For switch geometry, we create 3 nodes and 2 edges
        if (part.geometry.type === 'switch') {
            const { mainLength, branchRadius, branchLength, branchAngle, branchDirection } = part.geometry;

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

            // Calculate branch position and length
            // Prefer branchRadius (curved diverge) over branchLength (legacy straight)
            let branchExitPosition: Vector2;
            let effectiveBranchLength: number;

            if (branchRadius !== undefined) {
                // Curved diverge: calculate arc endpoint
                const arcAngleRad = (branchAngle * Math.PI) / 180;
                // Local offset from arc geometry
                const localX = branchRadius * Math.sin(arcAngleRad);
                const localY = branchAngleDir * branchRadius * (1 - Math.cos(arcAngleRad));
                // Transform to world coordinates
                branchExitPosition = {
                    x: position.x + Math.cos(radians) * localX - Math.sin(radians) * localY,
                    y: position.y + Math.sin(radians) * localX + Math.cos(radians) * localY,
                };
                // Arc length for curved diverge
                effectiveBranchLength = branchRadius * arcAngleRad;
            } else if (branchLength !== undefined) {
                // Legacy: straight line to branch exit
                branchExitPosition = {
                    x: position.x + Math.cos(branchRadians) * branchLength,
                    y: position.y + Math.sin(branchRadians) * branchLength,
                };
                effectiveBranchLength = branchLength;
            } else {
                // Fallback: use mainLength as approximation
                branchExitPosition = {
                    x: position.x + Math.cos(branchRadians) * mainLength,
                    y: position.y + Math.sin(branchRadians) * mainLength,
                };
                effectiveBranchLength = mainLength;
            }

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
                length: effectiveBranchLength,
                intrinsicGeometry: { type: 'straight', length: effectiveBranchLength },
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
            const crossingGeom = part.geometry as import('../../data/catalog/types').CrossingGeometry;
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
            const arcCenter: Vector2 = {
                x: position.x + Math.cos(centerAngle) * radius,
                y: position.y + Math.sin(centerAngle) * radius,
            };

            // End position on the arc
            endPosition = {
                x: arcCenter.x + Math.cos(centerAngle + Math.PI + angleRad) * radius,
                y: arcCenter.y + Math.sin(centerAngle + Math.PI + angleRad) * radius,
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
