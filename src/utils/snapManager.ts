import type { SnapResult } from '../stores/useEditorStore';
import type { PartDefinition, Vector2, PartGeometry } from '../types';
import type { TrackNode, NodeId } from '../types';

// =============================================================================
// TRACK CONNECTION MODEL
// =============================================================================
//
// Physical Model:
// ---------------
// Track pieces connect via "connectors" at each end. For two tracks to connect:
// - Their connectors must be at the same position
// - Their connectors must face OPPOSITE directions (head-to-head)
//
// Coordinate System:
// ------------------
// - X increases to the right (east)
// - Y increases downward (south) - standard screen coordinates
// - Rotation 0° points right (east), 90° points down (south)
//
// Node Rotation Convention:
// -------------------------
// A node's rotation indicates the direction it FACES (outward from the track).
// For head-to-head connection, two nodes must differ by 180°.
//
// Example: If an existing endpoint faces 180° (west), an incoming track's
// connector must face 0° (east) to connect properly.
//
// Track Geometry:
// ---------------
// - Straight: Both ends face the same direction (the track's forward direction)
// - Curve: End rotation = Start rotation + curve angle (always curves LEFT)
//   - The arc center is 90° counter-clockwise from the start heading
//   - To curve right, you must flip/rotate the entire track piece
//
// Snapping Logic:
// ---------------
// When dragging a track piece, we check both its START and END connectors
// against all open endpoints. The system picks the best match based on:
// 1. Distance (closest wins)
// 2. User's rotation hint (tiebreaker when distances are similar)
//
// =============================================================================

// Snap configuration by system - determines how forgiving the snap detection is
const SNAP_CONFIG = {
    'n-scale': {
        radius: 30,      // pixels - how close you need to drag to trigger snap
        maxAngle: 30,    // degrees - unused, kept for potential future use
    },
    'wooden': {
        radius: 40,      // pixels - more forgiving for wooden track
        maxAngle: 45,    // degrees - unused, kept for potential future use
    },
};


/**
 * Calculate Euclidean distance between two points
 */
function distance(a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find all open endpoints in the track graph.
 * An "open endpoint" is a node with only one connection - it has a free side
 * available for connecting new track pieces.
 */
export function findOpenEndpoints(nodes: Record<NodeId, TrackNode>): TrackNode[] {
    return Object.values(nodes).filter(node => node.connections.length === 1);
}

/**
 * Find the closest open endpoint within snap range of a ghost connector.
 * 
 * This function doesn't check angles - the snap system auto-rotates the ghost
 * piece to align with whatever endpoint is found. This makes snapping more
 * forgiving and lets users approach from any angle.
 * 
 * @param ghostConnectorPosition - World position of the ghost's connector
 * @param _ghostConnectorRotation - Unused, kept for API compatibility  
 * @param openEndpoints - All available endpoints to snap to
 * @param system - Track system determines snap radius
 * @returns Best snap target, or null if nothing in range
 */
export function findSnapTarget(
    ghostConnectorPosition: Vector2,
    _ghostConnectorRotation: number,
    openEndpoints: TrackNode[],
    system: 'n-scale' | 'wooden'
): SnapResult | null {
    const config = SNAP_CONFIG[system];

    let bestMatch: SnapResult | null = null;
    let bestDistance = Infinity;

    for (const endpoint of openEndpoints) {
        const dist = distance(ghostConnectorPosition, endpoint.position);

        // Must be within snap radius
        if (dist > config.radius) continue;

        // Pick the closest endpoint
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
    ghostPosition: Vector2;  // Where to place the track's start point
    ghostRotation: number;   // Track's forward direction (degrees)
}

/**
 * Calculate the END connector position and rotation given the START position and rotation.
 * This is the core geometry calculation for track pieces.
 * 
 * For STRAIGHT tracks:
 * - End position is simply: start + (length * direction_vector)
 * - End rotation equals start rotation (same direction throughout)
 * 
 * For CURVE tracks (always LEFT-curving):
 * - Arc center is perpendicular LEFT of the start heading (90° CCW)
 * - The curve sweeps through the specified angle
 * - End rotation = start rotation + curve angle
 * 
 * Visual example of a 45° left curve starting at rotation 0° (east):
 * 
 *        End (rotation 45°, northeast)
 *       /
 *      /  ← arc curves left
 *     /
 *    Start (rotation 0°, east)
 *         ↑
 *       Center (directly above start, at distance = radius)
 * 
 * @param startPos - Position of the track's start connector
 * @param startRot - Direction the track points at start (degrees)
 * @param geometry - Part geometry (straight length or curve radius/angle)
 * @returns End position and rotation, or null for unsupported geometry types
 */
function calculateEndpoint(
    startPos: Vector2,
    startRot: number,
    geometry: PartGeometry
): { position: Vector2; rotation: number } | null {
    const startRad = (startRot * Math.PI) / 180;

    if (geometry.type === 'straight') {
        // Straight track: move along the direction vector
        return {
            position: {
                x: startPos.x + Math.cos(startRad) * geometry.length,
                y: startPos.y + Math.sin(startRad) * geometry.length,
            },
            rotation: startRot,  // Straight tracks maintain direction
        };
    } else if (geometry.type === 'curve') {
        const { radius, angle } = geometry;
        const angleRad = (angle * Math.PI) / 180;

        // LEFT CURVE GEOMETRY:
        // The arc center is 90° counter-clockwise from the start heading.
        // This means the curve always bends LEFT relative to forward motion.
        //
        // To get a RIGHT curve, the user must rotate the entire track 180°
        // (effectively using it "backwards").

        const centerAngle = startRad - Math.PI / 2;  // 90° CCW = left of heading
        const centerX = startPos.x + Math.cos(centerAngle) * radius;
        const centerY = startPos.y + Math.sin(centerAngle) * radius;

        // The end point is on the arc, rotated by the curve angle from start
        // Start is at angle (centerAngle + π) from center
        // End is at angle (centerAngle + π + curveAngle) from center
        const endAngle = centerAngle + Math.PI + angleRad;

        return {
            position: {
                x: centerX + Math.cos(endAngle) * radius,
                y: centerY + Math.sin(endAngle) * radius,
            },
            rotation: startRot + angle,  // Direction changes by curve angle
        };
    }

    // Switch/Crossing geometry not handled here (they have multiple ends)
    return null;
}

/**
 * Normalize angle to 0-360 range.
 */
function normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
}

/**
 * Calculate the smallest angular difference between two angles.
 * Result is always in range [0, 180].
 */
function angleDifference(a: number, b: number): number {
    const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    return diff > 180 ? 360 - diff : diff;
}

/**
 * Find the best snap target using FACADE-BASED mating logic.
 * 
 * FACADE MODEL:
 * - Each connector has a "facade angle" - the direction it faces outward
 * - For valid mating, two connectors' facades must face OPPOSITE directions
 *   (differ by 180° ± tolerance)
 * 
 * ALGORITHM:
 * 1. For each target endpoint (with its facade = target.rotation):
 *    a. Calculate what ghost rotation would mate via START connector
 *    b. Calculate what ghost rotation would mate via END connector
 *    c. Check if resulting position is close enough to trigger snap
 *    d. Validate that facades actually face opposite (prevents Y-forks)
 * 2. Collect all valid candidates
 * 3. Pick the best based on distance and user rotation preference
 */
export function findBestSnapForTrack(
    ghostStartPos: Vector2,
    ghostRotation: number,
    part: PartDefinition,
    openEndpoints: TrackNode[],
    system: 'n-scale' | 'wooden',
    edges?: Record<string, { startNodeId: string; endNodeId: string }>
): BestSnapResult | null {
    type SnapCandidate = BestSnapResult & {
        angleDiffFromUser: number;
        snapType: 'START' | 'END';
        ourFacade: number;
        targetFacade: number;
        targetIsStart?: boolean;  // Is target the START of its edge?
    };
    const candidates: SnapCandidate[] = [];
    const config = SNAP_CONFIG[system];

    // Helper: determine if target is a START or END of its connected edge
    const getTargetRole = (target: TrackNode): 'start' | 'end' | 'unknown' => {
        if (!edges || target.connections.length !== 1) return 'unknown';
        const edgeId = target.connections[0];
        const edge = edges[edgeId];
        if (!edge) return 'unknown';
        if (edge.startNodeId === target.id) return 'start';
        if (edge.endNodeId === target.id) return 'end';
        return 'unknown';
    };

    // For each target, calculate snap options based on target's role
    for (const target of openEndpoints) {
        const targetFacade = target.rotation;
        const targetRole = getTargetRole(target);

        // Calculate target's TANGENT direction (the direction the track travels at this point)
        // START nodes face backward, so tangent = facade + 180
        // END nodes face forward, so tangent = facade
        const targetTangent = (targetRole === 'start')
            ? normalizeAngle(targetFacade + 180)
            : targetFacade;

        console.log('[snapManager] Target analysis:', {
            targetId: target.id.slice(0, 8),
            targetFacade,
            targetRole,
            targetTangent,
        });

        // =====================================================================
        // OPTION A: Connect via our START end (A') to target
        // =====================================================================
        // For SMOOTH EXTENSION: our tangent at START should match target's tangent
        //
        // For straights: tangent at start = rotation
        // For curves: tangent at start = rotation + 180 (due to arc geometry)
        //
        // So: straight → rotation = targetTangent
        //     curve → rotation = targetTangent - 180
        {
            const isCurve = part.geometry.type === 'curve';
            const startSnapRotation = isCurve
                ? normalizeAngle(targetTangent - 180)
                : targetTangent;
            const startSnapPosition = target.position;
            const startFacade = normalizeAngle(startSnapRotation + 180);

            console.log('[snapManager] START option:', {
                targetTangent,
                isCurve,
                startSnapRotation,
                startFacade,
            });

            const distToStart = Math.hypot(
                target.position.x - ghostStartPos.x,
                target.position.y - ghostStartPos.y
            );

            if (distToStart <= config.radius) {
                candidates.push({
                    snap: {
                        targetNodeId: target.id,
                        targetPosition: target.position,
                        targetRotation: target.rotation,
                        distance: distToStart,
                    },
                    ghostPosition: startSnapPosition,
                    ghostRotation: startSnapRotation,
                    angleDiffFromUser: angleDifference(startSnapRotation, ghostRotation),
                    snapType: 'START',
                    ourFacade: startFacade,
                    targetFacade: targetFacade,
                });
            }
        }

        // =====================================================================
        // OPTION B: Connect via our END end (A") to target
        // =====================================================================
        // For SMOOTH EXTENSION: our tangent at END should match target's tangent (targetTangent)
        //
        // For straights: tangent at end = rotation
        // For curves: tangent at end = rotation + deltaAngle - 180 (due to arc geometry)
        //
        // So: straight → rotation = targetTangent
        //     curve → rotation = targetTangent - deltaAngle + 180
        if (part.geometry.type === 'straight' || part.geometry.type === 'curve') {
            let deltaAngle = 0;
            if (part.geometry.type === 'curve') {
                deltaAngle = part.geometry.angle;
            }

            // Use targetTangent from above (calculated based on target role)
            const endSnapRotation = (part.geometry.type === 'curve')
                ? normalizeAngle(targetTangent - deltaAngle + 180)
                : targetTangent;

            const endFacade = normalizeAngle(endSnapRotation + deltaAngle);

            console.log('[snapManager] END option:', {
                targetTangent,
                isCurve: part.geometry.type === 'curve',
                endSnapRotation,
                endFacade,
            });

            // Calculate where START would be if END is at target
            const relativeEnd = calculateEndpoint({ x: 0, y: 0 }, endSnapRotation, part.geometry);

            if (relativeEnd) {
                const endSnapPosition = {
                    x: target.position.x - relativeEnd.position.x,
                    y: target.position.y - relativeEnd.position.y,
                };

                // Distance from ghost to required position
                const jumpDistance = Math.hypot(
                    endSnapPosition.x - ghostStartPos.x,
                    endSnapPosition.y - ghostStartPos.y
                );

                // Calculate distance from current ghost END to target
                const currentEnd = calculateEndpoint(ghostStartPos, ghostRotation, part.geometry);
                const distToEnd = currentEnd
                    ? Math.hypot(target.position.x - currentEnd.position.x, target.position.y - currentEnd.position.y)
                    : Infinity;

                // Use smaller distance for triggering
                const effectiveDistance = Math.min(distToEnd, jumpDistance);
                const maxCheckRadius = config.radius * 2;

                if (effectiveDistance <= maxCheckRadius) {
                    candidates.push({
                        snap: {
                            targetNodeId: target.id,
                            targetPosition: target.position,
                            targetRotation: target.rotation,
                            distance: effectiveDistance,
                        },
                        ghostPosition: endSnapPosition,
                        ghostRotation: endSnapRotation,
                        angleDiffFromUser: angleDifference(endSnapRotation, ghostRotation),
                        snapType: 'END',
                        ourFacade: endFacade,
                        targetFacade: targetFacade,
                    });
                }
            }
        }
    }

    // =========================================================================
    // SELECT BEST CANDIDATE
    // =========================================================================
    if (candidates.length === 0) {
        return null;
    }

    // Debug: Log all candidates
    console.log('[snapManager] Candidates:', candidates.map(c => ({
        type: c.snapType,
        ourFacade: c.ourFacade.toFixed(0),
        targetFacade: c.targetFacade.toFixed(0),
        facadeDiff: angleDifference(c.ourFacade, c.targetFacade).toFixed(0),
        distance: c.snap.distance.toFixed(1),
    })));

    // For curves, ALWAYS prefer END (prevents Y-forks by design)
    const isCurve = part.geometry.type === 'curve';

    candidates.sort((a, b) => {
        // For curves: END always wins over START
        if (isCurve) {
            if (a.snapType === 'END' && b.snapType === 'START') return -1;
            if (a.snapType === 'START' && b.snapType === 'END') return 1;
        }

        // Then by distance
        const distDiff = a.snap.distance - b.snap.distance;
        if (Math.abs(distDiff) > 5) return distDiff;

        // Then by user rotation preference
        return a.angleDiffFromUser - b.angleDiffFromUser;
    });

    const best = candidates[0];

    console.log('[snapManager] Selected:', {
        type: best.snapType,
        facadeDiff: angleDifference(best.ourFacade, best.targetFacade).toFixed(0),
        reason: isCurve && best.snapType === 'END' ? 'END preferred for curve' : 'closest',
    });

    return {
        snap: best.snap,
        ghostPosition: best.ghostPosition,
        ghostRotation: best.ghostRotation,
    };
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
