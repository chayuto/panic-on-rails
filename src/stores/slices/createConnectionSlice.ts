/**
 * Connection Slice - Network Operations
 *
 * Handles connecting track pieces, moving networks, and switch toggling.
 * Contains the complex graph traversal and geometric transformation logic.
 *
 * Utility functions are extracted to connectionOps/:
 * - geometrySync.ts - Geometry synchronization
 * - validation.ts - Layout integrity validation
 */

import type {
    NodeId,
    EdgeId,
    TrackEdge,
    Vector2,
} from '../../types';
import { normalizeAngle } from '../../utils/geometry';
import {
    spatialIndex,
    nodeIndex,
    getEdgeBounds,
    getNodeBounds,
} from './spatialHelpers';
import type { SliceCreator, ConnectionSlice } from './types';

// Import extracted utilities
import { syncGeometryToNodes } from './connectionOps/geometrySync';
import { validateLayoutIntegrity } from './connectionOps/validation';

/**
 * Creates the connection slice with network manipulation operations.
 */
export const createConnectionSlice: SliceCreator<ConnectionSlice> = (set) => ({
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
});
