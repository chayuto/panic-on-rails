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
import { normalizeAngle, degreesToRadians } from '../../../utils/geometry';

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
    /** Maps connector localId to generated node ID */
    connectorNodeMap: Record<string, NodeId>;
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

    const radians = degreesToRadians(rotation);

    // Wye: two symmetric curved diverges and no straight route. The right
    // arc is the "main" route (switchState 0), the left arc the branch.
    if (geometry.isWye && branchRadius !== undefined) {
        const right = createDivergingArc(partId, entryNodeId, mainEdgeId, position, rotation, branchRadius, branchAngle, 'right');
        const left = createDivergingArc(partId, entryNodeId, branchEdgeId, position, rotation, branchRadius, branchAngle, 'left');
        const mainExitNode: TrackNode = { id: mainExitNodeId, position: right.exitPosition, rotation: right.exitRotation, connections: [mainEdgeId], type: 'endpoint' };
        const branchExitNode: TrackNode = { id: branchExitNodeId, position: left.exitPosition, rotation: left.exitRotation, connections: [branchEdgeId], type: 'endpoint' };
        right.edge.endNodeId = mainExitNodeId;
        left.edge.endNodeId = branchExitNodeId;
        return {
            nodes: [
                {
                    id: entryNodeId,
                    position,
                    rotation: normalizeAngle(rotation + 180),
                    connections: [mainEdgeId, branchEdgeId],
                    type: 'switch',
                    switchState: 0,
                    switchBranches: [mainEdgeId, branchEdgeId],
                },
                mainExitNode,
                branchExitNode,
            ],
            edges: [right.edge, left.edge],
            primaryEdgeId: mainEdgeId,
            connectorNodeMap: {
                'entry': entryNodeId,
                'right': mainExitNodeId, 'main': mainExitNodeId,
                'left': branchExitNodeId, 'branch': branchExitNodeId,
            },
        };
    }

    // Calculate main exit position (straight through)
    const mainExitPosition: Vector2 = {
        x: position.x + Math.cos(radians) * mainLength,
        y: position.y + Math.sin(radians) * mainLength,
    };

    // Calculate branch exit position (diverging)
    const branchAngleDir = branchDirection === 'left' ? -1 : 1;
    const branchRadians = radians + (branchAngleDir * degreesToRadians(branchAngle));

    // Calculate branch position and length
    // Prefer branchRadius (curved diverge) over branchLength (legacy straight)
    let branchExitPosition: Vector2;
    let effectiveBranchLength: number;

    if (branchRadius !== undefined) {
        // Curved diverge: calculate arc endpoint
        const arcAngleRad = degreesToRadians(branchAngle);
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

    // Build branch edge geometry — arc when branchRadius is provided, straight otherwise
    let branchEdge: TrackEdge;

    if (branchRadius !== undefined) {
        // Arc geometry for curved diverge
        // The arc center is perpendicular to the entry direction
        const perpDir = branchDirection === 'left' ? -1 : 1;
        const arcCenter = {
            x: position.x - Math.sin(radians) * perpDir * branchRadius,
            y: position.y + Math.cos(radians) * perpDir * branchRadius,
        };

        // Start angle: from center to entry point
        // Entry point is at `position`, center is at `arcCenter`
        const startAngleRad = Math.atan2(position.y - arcCenter.y, position.x - arcCenter.x);
        const startAngleDeg = normalizeAngle((startAngleRad * 180) / Math.PI);

        // End angle: from center to branch exit point
        const endAngleRad = Math.atan2(branchExitPosition.y - arcCenter.y, branchExitPosition.x - arcCenter.x);
        const endAngleDeg = normalizeAngle((endAngleRad * 180) / Math.PI);

        // 'ccw' here means increasing angles (see calculateArcCenter), which is
        // clockwise on screen (+Y down): the right-hand branch.
        const arcDirection: 'cw' | 'ccw' = branchDirection === 'right' ? 'ccw' : 'cw';

        branchEdge = {
            id: branchEdgeId,
            partId,
            startNodeId: entryNodeId,
            endNodeId: branchExitNodeId,
            geometry: {
                type: 'arc',
                center: arcCenter,
                radius: branchRadius,
                startAngle: startAngleDeg,
                endAngle: endAngleDeg,
            },
            length: effectiveBranchLength,
            intrinsicGeometry: {
                type: 'arc',
                radius: branchRadius,
                sweepAngle: branchAngle,
                direction: arcDirection,
            },
        };
    } else {
        branchEdge = {
            id: branchEdgeId,
            partId,
            startNodeId: entryNodeId,
            endNodeId: branchExitNodeId,
            geometry: { type: 'straight', start: position, end: branchExitPosition },
            length: effectiveBranchLength,
            intrinsicGeometry: { type: 'straight', length: effectiveBranchLength },
        };
    }

    return {
        nodes: [entryNode, mainExitNode, branchExitNode],
        edges: [mainEdge, branchEdge],
        primaryEdgeId: mainEdgeId,
        connectorNodeMap: { 'entry': entryNodeId, 'main': mainExitNodeId, 'branch': branchExitNodeId },
    };
}

/**
 * Build one curved diverging route of a switch: an arc of `radius` sweeping
 * `angle` degrees to the left or right of the entry direction.
 * The returned edge's `endNodeId` is left empty for the caller to fill in.
 */
function createDivergingArc(
    partId: PartId,
    entryNodeId: NodeId,
    edgeId: EdgeId,
    position: Vector2,
    rotation: number,
    radius: number,
    angle: number,
    side: 'left' | 'right'
): { edge: TrackEdge; exitPosition: Vector2; exitRotation: number } {
    const radians = degreesToRadians(rotation);
    const dir = side === 'left' ? -1 : 1;
    const arcRad = degreesToRadians(angle);

    const localX = radius * Math.sin(arcRad);
    const localY = dir * radius * (1 - Math.cos(arcRad));
    const exitPosition = {
        x: position.x + Math.cos(radians) * localX - Math.sin(radians) * localY,
        y: position.y + Math.sin(radians) * localX + Math.cos(radians) * localY,
    };
    const center = {
        x: position.x - Math.sin(radians) * dir * radius,
        y: position.y + Math.cos(radians) * dir * radius,
    };
    const startAngle = normalizeAngle(Math.atan2(position.y - center.y, position.x - center.x) * 180 / Math.PI);

    return {
        edge: {
            id: edgeId,
            partId,
            startNodeId: entryNodeId,
            endNodeId: '' as NodeId,
            geometry: { type: 'arc', center, radius, startAngle, endAngle: startAngle + dir * angle },
            length: radius * arcRad,
            // 'ccw' = increasing angles = clockwise on screen = right-hand
            intrinsicGeometry: { type: 'arc', radius, sweepAngle: angle, direction: side === 'right' ? 'ccw' : 'cw' },
        },
        exitPosition,
        exitRotation: normalizeAngle(rotation + dir * angle),
    };
}
