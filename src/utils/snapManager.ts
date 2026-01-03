import type { SnapResult } from '../stores/useEditorStore';
import type { PartDefinition, Vector2, PartGeometry } from '../types';
import type { TrackNode, NodeId } from '../types';

// Snap configuration by system
const SNAP_CONFIG = {
    'n-scale': {
        radius: 30,      // pixels
        maxAngle: 30,    // degrees - increased from 5 to work with curves
    },
    'wooden': {
        radius: 40,      // pixels (more forgiving)
        maxAngle: 45,    // degrees - increased from 15 to work with curves
    },
};



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
    _ghostConnectorRotation: number, // Kept for API compatibility but not used for filtering
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

        // No angle check - we auto-rotate to match the target
        // This allows snapping from any angle and the ghost will rotate to fit

        // This is a valid snap candidate - pick closest
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
 * Result including the necessary transform for the ghost
 */
export interface BestSnapResult {
    snap: SnapResult;
    ghostPosition: Vector2;
    ghostRotation: number;
}

/**
 * Calculate the position of a connector based on start position, rotation, and geometry.
 * Returns the position and the rotation AT that point.
 */
function calculateEndpoint(
    startPos: Vector2,
    startRot: number,
    geometry: PartGeometry
): { position: Vector2; rotation: number } | null {
    const startRad = (startRot * Math.PI) / 180;

    if (geometry.type === 'straight') {
        return {
            position: {
                x: startPos.x + Math.cos(startRad) * geometry.length,
                y: startPos.y + Math.sin(startRad) * geometry.length,
            },
            rotation: startRot,
        };
    } else if (geometry.type === 'curve') {
        const { radius, angle } = geometry;
        const angleRad = (angle * Math.PI) / 180;

        // Center is 90 degrees CCW from start heading (assuming left curve behavior for positive angle)
        // Note: The system assumes standardized curves. If angle is positive, it curves "Left" relative to forward?
        // Let's verify standard assumption: 
        // In useTrackStore: centerAngle = startRad - Math.PI / 2; (Left curve)
        // And endPosition calculation matches this.

        const centerAngle = startRad - Math.PI / 2;
        const centerX = startPos.x + Math.cos(centerAngle) * radius;
        const centerY = startPos.y + Math.sin(centerAngle) * radius;

        const endAngle = centerAngle + Math.PI + angleRad;

        return {
            position: {
                x: centerX + Math.cos(endAngle) * radius,
                y: centerY + Math.sin(endAngle) * radius,
            },
            rotation: startRot + angle,
        };
    }

    // Switch/Crossing handling could be added here
    return null;
}

/**
 * Find the best snap target by checking ALL connectors of the ghost piece.
 * Returns the snap result AND the new transform for the ghost to satisfy that map.
 */
export function findBestSnapForTrack(
    ghostStartPos: Vector2,
    ghostRotation: number,
    part: PartDefinition,
    openEndpoints: TrackNode[],
    system: 'n-scale' | 'wooden'
): BestSnapResult | null {
    let bestResult: BestSnapResult | null = null;
    let minDistance = Infinity;

    // 1. Check Start Node Snapping
    // Properties of Start Node:
    // Position: ghostStartPos
    // Rotation: ghostRotation. (Points OUT of the track start)
    // Wait, standard node rotation usually points OUT of the connection.
    // If I drive onto the track at Start, I am heading in `ghostRotation`.
    // So `ghostRotation` is the "Into Track" direction? 
    // No, `useTrackStore`: startNode.rotation = rotation + 180.
    // So `ghostRotation` is the Forward Vector of the track.
    // Start Node rotation (facing away from track) is `ghostRotation + 180`.

    // `findSnapTarget` logic: 
    // expectedAngle = (ghostConnectorRotation + 180) % 360;
    // It compares expectedAngle to target.rotation.
    // If we pass `ghostRotation` (Forward), expected is Backwards.
    // If Target is Endpoint (facing out/backwards relative to its track), we want Backwards == Target.
    // So passing `ghostRotation` is correct for Head-to-Head snapping.

    const startSnap = findSnapTarget(ghostStartPos, ghostRotation, openEndpoints, system);
    if (startSnap && startSnap.distance < minDistance) {
        minDistance = startSnap.distance;
        bestResult = {
            snap: startSnap,
            // If we snap Start, ghost moves so Start is at Target.
            ghostPosition: startSnap.targetPosition,
            // Ghost aligns to target. Target faces X. We face X + 180.
            ghostRotation: (startSnap.targetRotation + 180) % 360,
        };
    }

    // 2. Check End Node Snapping
    if (part.geometry.type === 'straight' || part.geometry.type === 'curve') {
        // Calculate where the End Node is currently (based on mouse pos)
        const currentEnd = calculateEndpoint(ghostStartPos, ghostRotation, part.geometry);

        if (currentEnd) {
            // Check snap at current End Node position
            // End Node direction: currentEnd.rotation.
            // But End Node "facing" (connector direction) is same as track direction at that point?
            // `useTrackStore`: endNode.rotation = endRotation.
            // So yes, it faces "Forward".

            const endSnap = findSnapTarget(currentEnd.position, currentEnd.rotation, openEndpoints, system);

            if (endSnap && endSnap.distance < minDistance) {
                // Found a better snap at the end!

                // We want to align End Node to Target.
                // Target faces T. We want End Node to face T + 180.
                // So newEndRotation = T + 180.
                const targetRotation = endSnap.targetRotation;
                const requiredEndRotation = (targetRotation + 180) % 360;

                // Track geometry dictates: EndRot = StartRot + Delta.
                // So StartRot = EndRot - Delta.
                let deltaAngle = 0;
                if (part.geometry.type === 'curve') {
                    deltaAngle = part.geometry.angle;
                }

                const newStartRotation = (requiredEndRotation - deltaAngle + 360) % 360;

                // Now calculate new Start Position.
                // We know New End Position = Target Position.
                // We need to backtrack from Target to Start.
                // Determine vector from Start to End using NEW rotation.
                const relativeEnd = calculateEndpoint({ x: 0, y: 0 }, newStartRotation, part.geometry);

                if (relativeEnd) {
                    const newStartPosition = {
                        x: endSnap.targetPosition.x - relativeEnd.position.x,
                        y: endSnap.targetPosition.y - relativeEnd.position.y,
                    };

                    minDistance = endSnap.distance;
                    bestResult = {
                        snap: endSnap,
                        ghostPosition: newStartPosition,
                        ghostRotation: newStartRotation,
                    };
                }
            }
        }
    }

    return bestResult;
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
