/**
 * Helper Factory Functions for Creating Parts
 * 
 * These functions reduce boilerplate when adding new parts.
 * Contributors should use these instead of manually creating objects.
 * 
 * @example
 * // Before (6 lines):
 * { id: 'kato-20-000', name: 'Straight 248mm', brand: 'kato', scale: 'n-scale', geometry: { type: 'straight', length: 248 } }
 * 
 * // After (1 line):
 * straight('kato-20-000', 'Straight 248mm', 248, 'kato', 'n-scale')
 */

import type { PartDefinition, PartBrand, PartScale } from './types';

// ===========================
// Straight Track
// ===========================

/**
 * Create a straight track part
 * 
 * @param id - Unique identifier (format: brand-productcode)
 * @param name - Display name
 * @param length - Length in millimeters
 * @param brand - Manufacturer brand
 * @param scale - Track scale/system
 * @param cost - Cost in cents (default: based on length)
 */
export function straight(
    id: string,
    name: string,
    length: number,
    brand: PartBrand,
    scale: PartScale,
    cost?: number
): PartDefinition {
    // Default cost: ~$0.02 per mm, min $2
    const defaultCost = Math.max(200, Math.round(length * 2));
    return {
        id,
        name,
        brand,
        scale,
        geometry: { type: 'straight', length },
        cost: cost ?? defaultCost,
    };
}

// ===========================
// Curved Track
// ===========================

/**
 * Create a curved track part
 * 
 * @param id - Unique identifier
 * @param name - Display name
 * @param radius - Curve radius in millimeters
 * @param angle - Arc angle in degrees (e.g., 45, 30, 15)
 * @param brand - Manufacturer brand
 * @param scale - Track scale/system
 * @param cost - Cost in cents (default: based on arc length)
 */
export function curve(
    id: string,
    name: string,
    radius: number,
    angle: number,
    brand: PartBrand,
    scale: PartScale,
    cost?: number
): PartDefinition {
    // Default cost: based on arc length + radius premium
    const arcLength = calculateArcLength(radius, angle);
    const defaultCost = Math.max(300, Math.round(arcLength * 2 + radius * 0.5));
    return {
        id,
        name,
        brand,
        scale,
        geometry: { type: 'curve', radius, angle },
        cost: cost ?? defaultCost,
    };
}

// ===========================
// Switch / Turnout
// ===========================

interface SwitchOptions {
    mainLength: number;
    branchLength: number;
    branchAngle: number;
    branchDirection: 'left' | 'right';
}

/**
 * Create a switch/turnout track part
 * 
 * @param id - Unique identifier
 * @param name - Display name
 * @param opts - Switch geometry options
 * @param brand - Manufacturer brand
 * @param scale - Track scale/system
 * @param cost - Cost in cents (default: $15)
 * 
 * @example
 * switchPart('kato-20-202', '#4 Turnout Left', {
 *   mainLength: 248,
 *   branchLength: 186,
 *   branchAngle: 15,
 *   branchDirection: 'left'
 * }, 'kato', 'n-scale')
 */
export function switchPart(
    id: string,
    name: string,
    opts: SwitchOptions,
    brand: PartBrand,
    scale: PartScale,
    cost: number = 1500
): PartDefinition {
    return {
        id,
        name,
        brand,
        scale,
        geometry: {
            type: 'switch',
            mainLength: opts.mainLength,
            branchLength: opts.branchLength,
            branchAngle: opts.branchAngle,
            branchDirection: opts.branchDirection,
        },
        cost,
    };
}

// ===========================
// Crossing / Diamond
// ===========================

/**
 * Create a crossing/diamond track part
 * 
 * @param id - Unique identifier
 * @param name - Display name
 * @param length - Length of each crossing track in mm
 * @param crossingAngle - Angle of crossing (90 = perpendicular)
 * @param brand - Manufacturer brand
 * @param scale - Track scale/system
 * @param cost - Cost in cents (default: $20)
 */
export function crossing(
    id: string,
    name: string,
    length: number,
    crossingAngle: number,
    brand: PartBrand,
    scale: PartScale,
    cost: number = 2000
): PartDefinition {
    return {
        id,
        name,
        brand,
        scale,
        geometry: { type: 'crossing', length, crossingAngle },
        cost,
    };
}

// ===========================
// Utility Functions
// ===========================

/**
 * Calculate arc length for a curved track
 */
export function calculateArcLength(radius: number, angleDegrees: number): number {
    const angleRadians = (angleDegrees * Math.PI) / 180;
    return radius * angleRadians;
}

// ===========================
// Connector Computation
// ===========================

import type { ConnectorNode, PartConnectors } from '../../types/connector';

/**
 * Compute connector nodes from part geometry.
 * This provides backward compatibility for parts without explicit connector definitions.
 * 
 * Connectors are computed based on the geometry type:
 * - **Straight**: Two connectors at each end, facades pointing outward (180° apart)
 * - **Curve**: Two connectors, start facing back (180°), end facing outward at curve angle
 * - **Switch**: Three connectors - entry, main exit, branch exit
 * - **Crossing**: Four connectors for each track end
 * 
 * All positions are in local coordinates relative to the part's placement origin (0,0).
 * The placement origin is at the START connector (A) by convention.
 */
export function computeConnectors(part: PartDefinition): PartConnectors {
    const geometry = part.geometry;

    switch (geometry.type) {
        case 'straight': {
            // Straight track: A at origin facing back, B at end facing forward
            // Origin is at A (start), B is at (length, 0)
            const nodes: ConnectorNode[] = [
                {
                    localId: 'A',
                    localPosition: { x: 0, y: 0 },
                    localFacade: 180,  // Faces left/back
                    maxConnections: 1,
                },
                {
                    localId: 'B',
                    localPosition: { x: geometry.length, y: 0 },
                    localFacade: 0,  // Faces right/forward
                    maxConnections: 1,
                },
            ];
            return { nodes, primaryNodeId: 'A' };
        }

        case 'curve': {
            // Curve track: LEFT-curving arc
            // A at origin facing back, B at arc end facing tangent direction
            // 
            // For a LEFT curve with angle θ:
            // - Arc center is perpendicular left of start (at radius distance up)
            // - End position follows arc geometry
            // - End facade = θ (pointing outward along arc tangent)

            const { radius, angle } = geometry;
            const angleRad = (angle * Math.PI) / 180;

            // Arc center is 90° counter-clockwise from forward direction (up, negative Y in screen coords)
            const centerX = 0;  // Start is at origin, center is directly above
            const centerY = -radius;

            // End position: rotate from start around center by the arc angle
            // Start is at angle 90° (pointing down from center)
            // End is at angle (90° + curveAngle) from center
            const startAngleFromCenter = Math.PI / 2;  // 90° down from center
            const endAngleFromCenter = startAngleFromCenter + angleRad;

            const endX = centerX + Math.cos(endAngleFromCenter) * radius;
            const endY = centerY + Math.sin(endAngleFromCenter) * radius;

            const nodes: ConnectorNode[] = [
                {
                    localId: 'A',
                    localPosition: { x: 0, y: 0 },
                    localFacade: 180,  // Faces back (left)
                    maxConnections: 1,
                },
                {
                    localId: 'B',
                    localPosition: { x: endX, y: endY },
                    localFacade: angle,  // Faces tangent direction at end
                    maxConnections: 1,
                },
            ];
            return { nodes, primaryNodeId: 'A' };
        }

        case 'switch': {
            // Switch: Entry at origin, main exit straight ahead, branch exit at angle
            const { mainLength, branchLength, branchAngle, branchDirection } = geometry;
            const branchAngleDir = branchDirection === 'left' ? -1 : 1;
            const branchRad = (branchAngleDir * branchAngle * Math.PI) / 180;

            const nodes: ConnectorNode[] = [
                {
                    localId: 'entry',
                    localPosition: { x: 0, y: 0 },
                    localFacade: 180,  // Faces back
                    maxConnections: 1,
                },
                {
                    localId: 'main',
                    localPosition: { x: mainLength, y: 0 },
                    localFacade: 0,  // Faces forward
                    maxConnections: 1,
                },
                {
                    localId: 'branch',
                    localPosition: {
                        x: Math.cos(branchRad) * branchLength,
                        y: Math.sin(branchRad) * branchLength,
                    },
                    localFacade: branchAngleDir * branchAngle,  // Faces along branch direction
                    maxConnections: 1,
                },
            ];
            return { nodes, primaryNodeId: 'entry' };
        }

        case 'crossing': {
            // Crossing: Two tracks crossing at center
            // Path A: horizontal, Path B: at crossingAngle
            const { length, crossingAngle } = geometry;
            const halfLength = length / 2;
            const crossRad = (crossingAngle * Math.PI) / 180;

            const nodes: ConnectorNode[] = [
                // Path A (horizontal)
                {
                    localId: 'A1',
                    localPosition: { x: -halfLength, y: 0 },
                    localFacade: 180,
                    maxConnections: 1,
                },
                {
                    localId: 'A2',
                    localPosition: { x: halfLength, y: 0 },
                    localFacade: 0,
                    maxConnections: 1,
                },
                // Path B (at crossingAngle)
                {
                    localId: 'B1',
                    localPosition: {
                        x: -Math.cos(crossRad) * halfLength,
                        y: -Math.sin(crossRad) * halfLength,
                    },
                    localFacade: crossingAngle + 180,
                    maxConnections: 1,
                },
                {
                    localId: 'B2',
                    localPosition: {
                        x: Math.cos(crossRad) * halfLength,
                        y: Math.sin(crossRad) * halfLength,
                    },
                    localFacade: crossingAngle,
                    maxConnections: 1,
                },
            ];
            return { nodes, primaryNodeId: 'A1' };
        }

        default: {
            // Fallback for unknown geometry types
            const nodes: ConnectorNode[] = [
                {
                    localId: 'A',
                    localPosition: { x: 0, y: 0 },
                    localFacade: 180,
                    maxConnections: 1,
                },
            ];
            return { nodes, primaryNodeId: 'A' };
        }
    }
}

/**
 * Get connectors for a part, using explicit definition if available,
 * otherwise computing from geometry.
 */
export function getPartConnectors(part: PartDefinition): PartConnectors {
    // Future: Check for part.connectors explicit definition
    // For now, always compute from geometry
    return computeConnectors(part);
}
