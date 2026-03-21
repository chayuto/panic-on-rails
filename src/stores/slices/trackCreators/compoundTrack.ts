/**
 * Compound Track Creator
 *
 * Creates compound track pieces (crossovers, scissors crossings, slips)
 * by composing existing primitive creators.
 *
 * Algorithm:
 * 1. Instantiate each sub-part using its native creator
 * 2. Override partId on all edges to the compound part's ID
 * 3. Fuse internal joints by merging node pairs
 * 4. Assign shared placementId to all edges
 * 5. Return the unified node/edge graph
 *
 * @module trackCreators/compoundTrack
 */

import { v4 as uuidv4 } from 'uuid';
import type { NodeId, EdgeId, TrackNode, TrackEdge, Vector2, PartId } from '../../../types';
import type { CompoundGeometry } from '../../../data/catalog/types';
import { getPartById } from '../../../data/catalog/registry';
import { normalizeAngle, degreesToRadians } from '../../../utils/geometry';
import { createStraightTrack } from './standardTrack';
import { createCurveTrack } from './standardTrack';
import { createSwitchTrack } from './switchTrack';
import { createCrossingTrack } from './crossingTrack';
import type { StraightGeometry, CurveGeometry, SwitchGeometry, CrossingGeometry } from '../../../data/catalog/types';

/**
 * Result of creating a compound track piece.
 */
export interface CompoundTrackResult {
    /** All nodes (external endpoints + internal junctions) */
    nodes: TrackNode[];
    /** All edges from sub-parts */
    edges: TrackEdge[];
    /** The primary edge ID (first edge of first sub-part) */
    primaryEdgeId: EdgeId;
    /** Maps external connector externalId to generated node ID */
    connectorNodeMap: Record<string, NodeId>;
}

/**
 * Result from instantiating a single sub-part.
 */
interface SubPartResult {
    label: string;
    nodes: TrackNode[];
    edges: TrackEdge[];
    connectorNodeMap: Record<string, NodeId>;
}

/**
 * Transform a sub-part's local offset to world position.
 */
function transformOffset(
    compoundPosition: Vector2,
    compoundRotation: number,
    subPartOffset: Vector2
): Vector2 {
    const rad = degreesToRadians(compoundRotation);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
        x: compoundPosition.x + cos * subPartOffset.x - sin * subPartOffset.y,
        y: compoundPosition.y + sin * subPartOffset.x + cos * subPartOffset.y,
    };
}

/**
 * Instantiate a single sub-part using the appropriate creator.
 */
function instantiateSubPart(
    subPartDef: CompoundGeometry['subParts'][0],
    compoundPosition: Vector2,
    compoundRotation: number
): SubPartResult | null {
    const part = getPartById(subPartDef.partRef);
    if (!part) {
        console.warn(`[compound] Sub-part "${subPartDef.partRef}" not found in registry`);
        return null;
    }

    // Calculate world position and rotation for this sub-part
    const worldPos = transformOffset(
        compoundPosition,
        compoundRotation,
        subPartDef.offset
    );
    const worldRotation = normalizeAngle(compoundRotation + subPartDef.rotation);

    // Dispatch to the appropriate creator
    const geo = part.geometry;
    let result: { nodes: TrackNode[]; edges: TrackEdge[]; primaryEdgeId: EdgeId; connectorNodeMap: Record<string, NodeId> };

    switch (geo.type) {
        case 'straight':
            result = createStraightTrack(subPartDef.partRef as PartId, worldPos, worldRotation, geo as StraightGeometry);
            break;
        case 'curve':
            result = createCurveTrack(subPartDef.partRef as PartId, worldPos, worldRotation, geo as CurveGeometry);
            break;
        case 'switch':
            result = createSwitchTrack(subPartDef.partRef as PartId, worldPos, worldRotation, geo as SwitchGeometry);
            break;
        case 'crossing':
            result = createCrossingTrack(subPartDef.partRef as PartId, worldPos, worldRotation, geo as CrossingGeometry);
            break;
        default:
            console.warn(`[compound] Unsupported sub-part geometry type: ${(geo as { type: string }).type}`);
            return null;
    }

    return {
        label: subPartDef.label,
        nodes: result.nodes,
        edges: result.edges,
        connectorNodeMap: result.connectorNodeMap,
    };
}

/**
 * Creates a compound track piece by composing sub-parts.
 *
 * @param partId - Compound catalog part ID
 * @param position - World position for placement (compound origin)
 * @param rotation - Rotation in degrees
 * @param geometry - Compound geometry from catalog
 * @returns CompoundTrackResult with all nodes, edges, and connector map
 */
export function createCompoundTrack(
    partId: PartId,
    position: Vector2,
    rotation: number,
    geometry: CompoundGeometry
): CompoundTrackResult {
    const placementId = uuidv4();

    // Step 1: Instantiate all sub-parts
    const subResults = new Map<string, SubPartResult>();
    for (const subPartDef of geometry.subParts) {
        const result = instantiateSubPart(subPartDef, position, rotation);
        if (result) {
            subResults.set(subPartDef.label, result);
        }
    }

    // Collect all nodes and edges into mutable maps for fusing
    const nodesMap = new Map<NodeId, TrackNode>();
    const edgesList: TrackEdge[] = [];

    for (const sub of subResults.values()) {
        for (const node of sub.nodes) {
            nodesMap.set(node.id, node);
        }
        for (const edge of sub.edges) {
            // Override partId to the compound part's ID and set placementId
            edgesList.push({ ...edge, partId, placementId });
        }
    }

    // Step 2: Fuse internal joints
    for (const joint of geometry.joints) {
        const subA = subResults.get(joint.a.subPart);
        const subB = subResults.get(joint.b.subPart);
        if (!subA || !subB) {
            console.warn(`[compound] Joint references missing sub-part: "${joint.a.subPart}" or "${joint.b.subPart}"`);
            continue;
        }

        const nodeAId = subA.connectorNodeMap[joint.a.connector];
        const nodeBId = subB.connectorNodeMap[joint.b.connector];
        if (!nodeAId || !nodeBId) {
            console.warn(`[compound] Joint connector not found: "${joint.a.connector}" on "${joint.a.subPart}" or "${joint.b.connector}" on "${joint.b.subPart}"`);
            continue;
        }

        if (nodeAId === nodeBId) continue; // Already the same node

        const nodeA = nodesMap.get(nodeAId);
        const nodeB = nodesMap.get(nodeBId);
        if (!nodeA || !nodeB) continue;

        // Merge: keep nodeA (survivor), redirect nodeB's edges to nodeA
        // Merge connections (deduplicated)
        const mergedConnections = [...new Set([...nodeA.connections, ...nodeB.connections])];

        // Determine survivor type: prefer 'switch' > 'junction' > 'endpoint'
        let survivorType = nodeA.type;
        if (nodeB.type === 'switch') survivorType = 'switch';
        else if (nodeB.type === 'junction' && survivorType === 'endpoint') survivorType = 'junction';

        // If more than 2 connections after merge, upgrade to junction (unless switch)
        if (mergedConnections.length > 2 && survivorType === 'endpoint') {
            survivorType = 'junction';
        }

        const survivor: TrackNode = {
            ...nodeA,
            connections: mergedConnections,
            type: survivorType,
            // Preserve switch properties from either node
            switchState: nodeA.switchState ?? nodeB.switchState,
            switchBranches: nodeA.switchBranches ?? nodeB.switchBranches,
        };

        nodesMap.set(nodeAId, survivor);
        nodesMap.delete(nodeBId);

        // Redirect all edges that reference nodeBId to nodeAId
        for (let i = 0; i < edgesList.length; i++) {
            const edge = edgesList[i];
            let updated = false;
            let newStartNodeId = edge.startNodeId;
            let newEndNodeId = edge.endNodeId;

            if (edge.startNodeId === nodeBId) {
                newStartNodeId = nodeAId;
                updated = true;
            }
            if (edge.endNodeId === nodeBId) {
                newEndNodeId = nodeAId;
                updated = true;
            }

            if (updated) {
                edgesList[i] = { ...edge, startNodeId: newStartNodeId, endNodeId: newEndNodeId };
            }
        }

        // Update connectorNodeMap in subB to point to survivor
        for (const [key, val] of Object.entries(subB.connectorNodeMap)) {
            if (val === nodeBId) {
                subB.connectorNodeMap[key] = nodeAId;
            }
        }
        // Also update subA in case it references itself
        for (const [key, val] of Object.entries(subA.connectorNodeMap)) {
            if (val === nodeBId) {
                subA.connectorNodeMap[key] = nodeAId;
            }
        }
    }

    // Step 3: Build external connector map
    const connectorNodeMap: Record<string, NodeId> = {};
    for (const ext of geometry.externalConnectors) {
        const sub = subResults.get(ext.subPart);
        if (sub) {
            const nodeId = sub.connectorNodeMap[ext.connector];
            if (nodeId) {
                connectorNodeMap[ext.externalId] = nodeId;
            }
        }
    }

    const allNodes = Array.from(nodesMap.values());
    const primaryEdgeId = edgesList[0]?.id ?? ('' as EdgeId);

    return {
        nodes: allNodes,
        edges: edgesList,
        primaryEdgeId,
        connectorNodeMap,
    };
}
