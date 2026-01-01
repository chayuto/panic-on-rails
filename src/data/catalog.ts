import type { PartDefinition } from '../types';

/**
 * Kato Unitrack N-Scale Part Library
 * 
 * Based on official Kato geometry specifications.
 * Standard track spacing: 33mm
 * All measurements in millimeters.
 */
export const PART_LIBRARY: PartDefinition[] = [
    // ===========================
    // Straight Tracks
    // ===========================
    {
        id: 'kato-20-000',
        name: 'Straight 248mm',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'straight', length: 248 }
    },
    {
        id: 'kato-20-010',
        name: 'Straight 186mm',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'straight', length: 186 }
    },
    {
        id: 'kato-20-020',
        name: 'Straight 124mm',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'straight', length: 124 }
    },
    {
        id: 'kato-20-030',
        name: 'Straight 64mm',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'straight', length: 64 }
    },
    {
        id: 'kato-20-040',
        name: 'Feeder/Spacer 62mm',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'straight', length: 62 }
    },
    {
        id: 'kato-20-091',
        name: 'Short Straight 29mm',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'straight', length: 29 }
    },

    // ===========================
    // Curved Tracks (45° arcs)
    // ===========================
    {
        id: 'kato-20-170',
        name: 'Curve R216-45° (Tight)',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'curve', radius: 216, angle: 45 }
    },
    {
        id: 'kato-20-100',
        name: 'Curve R249-45°',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'curve', radius: 249, angle: 45 }
    },
    {
        id: 'kato-20-110',
        name: 'Curve R282-45° (Inner)',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'curve', radius: 282, angle: 45 }
    },
    {
        id: 'kato-20-120',
        name: 'Curve R315-45° (Outer)',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'curve', radius: 315, angle: 45 }
    },
    {
        id: 'kato-20-132',
        name: 'Curve R348-45°',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'curve', radius: 348, angle: 45 }
    },
    {
        id: 'kato-20-140',
        name: 'Curve R381-30°',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'curve', radius: 381, angle: 30 }
    },

    // ===========================
    // Large Radius (Shinkansen)
    // ===========================
    {
        id: 'kato-20-150',
        name: 'Curve R718-15° (Large)',
        brand: 'kato',
        scale: 'n-scale',
        geometry: { type: 'curve', radius: 718, angle: 15 }
    },
];

/**
 * Get a part definition by ID
 */
export function getPartById(partId: string): PartDefinition | undefined {
    return PART_LIBRARY.find(p => p.id === partId);
}

/**
 * Calculate arc length for a curved track
 */
export function calculateArcLength(radius: number, angleDegrees: number): number {
    const angleRadians = (angleDegrees * Math.PI) / 180;
    return radius * angleRadians;
}
