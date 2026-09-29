/**
 * The hobby economy, as a pure function of simulation events: running
 * trains earns hobby money, crashes cost repairs.
 *
 * Rates are tuned so one train circling the M1 oval (a 3.3 m lap) pays
 * for a V-set in roughly ten minutes, and two trains in half that.
 */

import type { EdgeId, TrackEdge } from '../types';
import type { SimEvent } from './step';

export const ECONOMY = {
    /** Earned per metre of model track run, per train (US cents) */
    CENTS_PER_METRE: 150,
    /** Repair bill per train in a collision (US cents) */
    REPAIR_CENTS: 2000,
} as const;

export interface Earnings {
    income: number;
    repairs: number;
}

/**
 * Money from one batch of events: a train earns for each edge it finishes
 * running (a `traverse` away from it), and each train in a collision
 * costs a repair.
 */
export function earningsFor(events: SimEvent[], edges: Record<EdgeId, TrackEdge>): Earnings {
    let income = 0;
    let repairs = 0;
    for (const event of events) {
        if (event.type === 'traverse') {
            const length = edges[event.fromEdgeId]?.length ?? 0;
            income += (length / 1000) * ECONOMY.CENTS_PER_METRE;
        } else if (event.type === 'collision') {
            repairs += ECONOMY.REPAIR_CENTS;
        }
    }
    return { income, repairs };
}
