/**
 * Move Part Operation
 * 
 * Handles moving a part or network of parts.
 * Updates positions, rotations, and spatial indices.
 */

import type { NodeId, EdgeId, TrackNode, TrackEdge, Vector2 } from '../../../types';
import { normalizeAngle } from '../../../utils/geometry';
import {
    spatialIndex,
    nodeIndex,
    getEdgeBounds,
    getNodeBounds,
} from '../spatialHelpers';
import { validateLayoutIntegrity } from './validation';
import { syncGeometryToNodes } from './geometrySync';
import { transformPosition } from './transform';

/**
 * Moves a part (and its connected network) to a new position and rotation.
 */
export function movePartOp(
    nodes: Record<NodeId, TrackNode>,
    edges: Record<EdgeId, TrackEdge>,
    edgeId: EdgeId,
    pivotNodeId: NodeId,
    targetPosition: Vector2,
    rotationDelta: number
): { nodes: Record<NodeId, TrackNode>; edges: Record<EdgeId, TrackEdge> } {
    console.log('[movePartOp] Starting part move:', {
        edgeId: edgeId.slice(0, 8),
        pivotNodeId: pivotNodeId.slice(0, 8),
        targetPosition,
        rotationDelta,
    });

    const edge = edges[edgeId];
    if (!edge) {
        console.warn('[movePartOp] Edge not found');
        return { nodes, edges };
    }

    // Find ALL nodes and edges in the connected network using BFS
    const networkNodeIds = new Set<NodeId>();
    const networkEdgeIds = new Set<EdgeId>();
    const queue: NodeId[] = [pivotNodeId];

    while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        if (networkNodeIds.has(currentNodeId)) continue;

        const currentNode = nodes[currentNodeId];
        if (!currentNode) continue;

        networkNodeIds.add(currentNodeId);

        // Traverse all connected edges
        for (const connEdgeId of currentNode.connections) {
            if (networkEdgeIds.has(connEdgeId)) continue;

            const connEdge = edges[connEdgeId];
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
    const networkEdges = Array.from(networkEdgeIds).map(id => edges[id]).filter(Boolean);

    // Get pivot node current position
    const pivotNode = nodes[pivotNodeId];
    if (!pivotNode) {
        console.warn('[movePartOp] Pivot node not found');
        return { nodes, edges };
    }

    const pivotPos = pivotNode.position;

    // Calculate translation: after rotation, pivot should be at target
    // translation = targetPosition - pivotPos
    const translation = {
        x: targetPosition.x - pivotPos.x,
        y: targetPosition.y - pivotPos.y,
    };

    const newNodes = { ...nodes };
    const newEdges = { ...edges };

    // Transform all nodes
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
            const newCenter = transformPosition(oldCenter, pivotPos, rotationDelta, translation);

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

    console.log('[movePartOp] Move complete:', {
        nodesTransformed: networkNodeIds.size,
        edgesTransformed: networkEdges.length,
    });

    // Sync geometry to ensure consistency (safety layer)
    const syncedEdges = syncGeometryToNodes(newNodes, newEdges);

    // Validate in development
    if (import.meta.env.DEV) {
        const errors = validateLayoutIntegrity(newNodes, syncedEdges);
        if (errors.length > 0) {
            console.error('[movePartOp] Layout integrity errors after move:', errors);
        }
    }

    return { nodes: newNodes, edges: syncedEdges };
}
