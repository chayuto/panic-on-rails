/**
 * Network Connection Operation
 * 
 * Handles connecting entire networks of tracks together.
 * Performs graph traversal to find connected components and transforms them.
 */

import type { NodeId, EdgeId, TrackNode, TrackEdge } from '../../../types';
import { normalizeAngle } from '../../../utils/geometry';
import {
    spatialIndex,
    nodeIndex,
    getEdgeBounds,
    getNodeBounds,
} from '../spatialHelpers';
import { validateLayoutIntegrity } from './validation';
import { transformPosition } from './transform';

/**
 * Connects a moving network to an anchor network.
 * Rotates and translates the moving network to align with the anchor.
 */
export function connectNetworksOp(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>,
    anchorNodeId: NodeId,
    movingNodeId: NodeId,
    movingEdgeId: EdgeId,
    rotationDelta: number
): { nodes: Record<NodeId, TrackNode>; edges: Record<EdgeId, TrackEdge> } {
    console.log('[connectNetworksOp] Starting atomic connect:', {
        anchorNodeId: anchorNodeId.slice(0, 8),
        movingNodeId: movingNodeId.slice(0, 8),
        movingEdgeId: movingEdgeId.slice(0, 8),
        rotationDelta,
    });

    // Validate nodes exist
    const anchorNode = nodes[anchorNodeId];
    const movingNode = nodes[movingNodeId];

    if (!anchorNode || !movingNode) {
        console.warn('[connectNetworksOp] Node not found:', {
            anchorExists: !!anchorNode,
            movingExists: !!movingNode,
        });
        return { nodes, edges };
    }

    // STEP 1: Find all nodes/edges in the moving network using BFS
    const networkNodeIds = new Set<NodeId>();
    const networkEdgeIds = new Set<EdgeId>();
    const queue: NodeId[] = [movingNodeId];

    while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        if (networkNodeIds.has(currentNodeId)) continue;

        const currentNode = nodes[currentNodeId];
        if (!currentNode) continue;

        networkNodeIds.add(currentNodeId);

        for (const connEdgeId of currentNode.connections) {
            if (networkEdgeIds.has(connEdgeId)) continue;

            const connEdge = edges[connEdgeId];
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

    console.log('[connectNetworksOp] Network found:', {
        nodes: networkNodeIds.size,
        edges: networkEdgeIds.size,
    });

    // STEP 2: Calculate transform parameters
    const pivotPos = movingNode.position;
    const targetPos = anchorNode.position;

    const translation = {
        x: targetPos.x - pivotPos.x,
        y: targetPos.y - pivotPos.y,
    };

    // STEP 3: Transform all nodes in network
    const newNodes = { ...nodes };
    const newEdges = { ...edges };

    for (const nodeId of networkNodeIds) {
        const node = nodes[nodeId];
        if (!node) continue;

        const newPosition = transformPosition(node.position, pivotPos, rotationDelta, translation);
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
        const e = edges[edgeId];
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
            const newCenter = transformPosition(oldCenter, pivotPos, rotationDelta, translation);
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

    console.log('[connectNetworksOp] Atomic connect complete:', {
        totalNodes: Object.keys(newNodes).length,
        totalEdges: Object.keys(newEdges).length,
        anchorConnectionsNow: newNodes[anchorNodeId].connections.length,
    });

    // Run validation in dev mode
    if (import.meta.env.DEV) {
        const errors = validateLayoutIntegrity(newNodes, newEdges);
        if (errors.length > 0) {
            console.error('[connectNetworksOp] Layout integrity errors:', errors);
        }
    }

    return { nodes: newNodes, edges: newEdges };
}
