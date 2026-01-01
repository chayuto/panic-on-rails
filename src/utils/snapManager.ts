import type { TrackNode, Vector2, NodeId } from '../types';
import type { SnapResult } from '../stores/useEditorStore';

// Snap configuration by system
const SNAP_CONFIG = {
    'n-scale': {
        radius: 30,      // pixels
        maxAngle: 5,     // degrees
    },
    'wooden': {
        radius: 40,      // pixels (more forgiving)
        maxAngle: 15,    // degrees (looser tolerance)
    },
};

/**
 * Find the shortest angle difference between two angles (in degrees)
 */
function shortestAngleDiff(a: number, b: number): number {
    let diff = ((b - a + 180) % 360) - 180;
    if (diff < -180) diff += 360;
    return diff;
}

/**
 * Calculate distance between two points
 */
function distance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find open endpoints (nodes with only 1 connection)
 */
export function findOpenEndpoints(nodes: Record<NodeId, TrackNode>): TrackNode[] {
    return Object.values(nodes).filter(node => node.connections.length === 1);
}

/**
 * Check if a ghost piece can snap to any open endpoint
 * 
 * @param ghostConnectorPosition - Position of the ghost's connector point
 * @param ghostConnectorRotation - Rotation of the ghost's connector (degrees)
 * @param openEndpoints - List of open endpoints on existing tracks
 * @param system - Current track system ('n-scale' or 'wooden')
 * @returns SnapResult if valid snap found, null otherwise
 */
export function findSnapTarget(
    ghostConnectorPosition: Vector2,
    ghostConnectorRotation: number,
    openEndpoints: TrackNode[],
    system: 'n-scale' | 'wooden'
): SnapResult | null {
    const config = SNAP_CONFIG[system];

    let bestMatch: SnapResult | null = null;
    let bestDistance = Infinity;

    for (const endpoint of openEndpoints) {
        // Calculate distance from ghost connector to endpoint
        const dist = distance(ghostConnectorPosition, endpoint.position);

        // Skip if outside snap radius
        if (dist > config.radius) continue;

        // Check angle compatibility
        // For a valid connection, angles should be ~180 degrees apart
        // (one faces "into" the other)
        const expectedAngle = (ghostConnectorRotation + 180) % 360;
        const angleDiff = Math.abs(shortestAngleDiff(expectedAngle, endpoint.rotation));

        if (angleDiff > config.maxAngle) continue;

        // This is a valid snap candidate
        if (dist < bestDistance) {
            bestDistance = dist;
            bestMatch = {
                targetNodeId: endpoint.id,
                targetPosition: endpoint.position,
                targetRotation: endpoint.rotation,
                distance: dist,
            };
        }
    }

    return bestMatch;
}

/**
 * Calculate the snapped position and rotation for a track piece
 * 
 * @param partConnectorOffset - Offset from part center to connector point
 * @param snapTarget - The target endpoint to snap to
 * @returns { position, rotation } for the snapped part
 */
export function calculateSnapTransform(
    partConnectorOffset: Vector2,
    snapTarget: SnapResult
): { position: Vector2; rotation: number } {
    // The part needs to be positioned such that its connector 
    // aligns with the target endpoint
    // 
    // The rotation needs to be the opposite of the target's rotation
    // (so they face each other)
    const rotation = (snapTarget.targetRotation + 180) % 360;

    // Calculate part center position by offsetting from snap point
    const radians = (rotation * Math.PI) / 180;
    const position: Vector2 = {
        x: snapTarget.targetPosition.x - Math.cos(radians) * partConnectorOffset.x,
        y: snapTarget.targetPosition.y - Math.sin(radians) * partConnectorOffset.x,
    };

    return { position, rotation };
}

/**
 * Check if a track placement would collide with existing tracks
 * (Simplified: just checks if center is too close to any existing node)
 */
export function checkCollision(
    position: Vector2,
    allNodes: Record<NodeId, TrackNode>,
    minDistance: number = 20
): boolean {
    for (const node of Object.values(allNodes)) {
        if (distance(position, node.position) < minDistance) {
            return true; // Collision detected
        }
    }
    return false;
}
