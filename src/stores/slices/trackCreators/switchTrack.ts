/**
 * Switch Track Creator
 *
 * Creates switch (turnout) track pieces with 3 nodes and 2 edges.
 * Switches have a common entry node that branches into main and diverging paths.
 *
 * @module trackCreators/switchTrack
 */

import { v4 as uuidv4 } from 'uuid';
import type { NodeId, EdgeId, TrackNode, TrackEdge, Vector2, PartId } from '../../../types';
import type { SwitchGeometry } from '../../../data/catalog/types';
import { normalizeAngle } from '../../../utils/geometry';

/**
 * Result of creating a switch track piece.
 */
export interface SwitchTrackResult {
    /** All nodes created (entry, main exit, branch exit) */
    nodes: TrackNode[];
    /** All edges created (main path, branch path) */
    edges: TrackEdge[];
    /** The primary edge ID (main path) for identification */
    primaryEdgeId: EdgeId;
}

/**
 * Creates a switch track piece with the given geometry.
 *
 * A switch consists of:
 * - 1 entry node (type: 'switch')
 * - 2 exit nodes (main and branch, type: 'endpoint')
 * - 2 edges (main path and branch path)
 *
 * @param partId - Catalog part ID
 * @param position - Entry node position
 * @param rotation - Entry direction in degrees
 * @param geometry - Switch geometry from catalog
 * @returns SwitchTrackResult with nodes, edges, and primary edge ID
 */
export function createSwitchTrack(
    partId: PartId,
    position: Vector2,
    rotation: number,
    geometry: SwitchGeometry
): SwitchTrackResult {
    const { mainLength, branchRadius, branchLength, branchAngle, branchDirection } = geometry;

    // Generate IDs
    const entryNodeId = uuidv4() as NodeId;
    const mainExitNodeId = uuidv4() as NodeId;
    const branchExitNodeId = uuidv4() as NodeId;
    const mainEdgeId = uuidv4() as EdgeId;
    const branchEdgeId = uuidv4() as EdgeId;

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

    return {
        nodes: [entryNode, mainExitNode, branchExitNode],
        edges: [mainEdge, branchEdge],
        primaryEdgeId: mainEdgeId,
    };
}
