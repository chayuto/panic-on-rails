/**
 * Track scales: how big a scale's trains are and how fast they run.
 *
 * The game was tuned in N (1:160). Every other scale is that, grown by its
 * model ratio: an H0 train (1:87) is 160/87 ≈ 1.84 times the size of an N
 * one, and runs 1.84 times as many mm/s at the same scale speed. Its
 * acceleration, braking and cornering grow by the same factor, so a
 * starter set drives the same in any scale.
 */

import type { PartScale } from '../data/catalog/types';

export interface ScaleSpec {
    id: PartScale;
    /** Short name for tabs and the shop: "N-Scale", "H0" */
    label: string;
    /** Model scale 1:ratio. Wooden toys have none; they drive as N. */
    ratio: number;
    /** Size and speed relative to N */
    size: number;
    /** Distance between the rails (mm) */
    gauge: number;
}

export const SCALES: Record<PartScale, ScaleSpec> = {
    'n-scale': { id: 'n-scale', label: 'N-Scale', ratio: 160, size: 1, gauge: 9 },
    'ho-scale': { id: 'ho-scale', label: 'H0', ratio: 87, size: 160 / 87, gauge: 16.5 },
    // British OO: 4 mm to the foot on H0's 16.5 mm gauge
    'oo-scale': { id: 'oo-scale', label: 'OO', ratio: 76.2, size: 160 / 76.2, gauge: 16.5 },
    'wooden': { id: 'wooden', label: 'Wooden', ratio: 160, size: 1, gauge: 20 },
};

/** Scales in the order the parts bin shows them. */
export const SCALE_ORDER: PartScale[] = ['n-scale', 'ho-scale', 'oo-scale', 'wooden'];

/** How much bigger (and faster) a train of this scale is than an N one. */
export function sizeOf(scale: PartScale | undefined): number {
    return SCALES[scale ?? 'n-scale'].size;
}
