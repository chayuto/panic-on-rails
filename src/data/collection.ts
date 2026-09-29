/**
 * The player's collection, as pure functions: what they own (boxes and
 * loose parts), what's on the table, and so what's left to build with.
 *
 * Nothing is "spent" when a piece is placed: what's left is always
 * owned − on the table, so undo, delete and loading a layout can never
 * lose or duplicate a piece.
 */

import { getPartById } from './catalog/registry';
import { getSetById } from './sets';
import type { EdgeId, TrackEdge } from '../types';

export type PartCounts = Record<string, number>;

/** Every track piece the player owns: the contents of their boxes plus loose parts. */
export function inventoryOf(ownedSets: Record<string, number>, looseParts: PartCounts): PartCounts {
    const totals: PartCounts = { ...looseParts };
    for (const [setId, boxes] of Object.entries(ownedSets)) {
        const set = getSetById(setId);
        if (!set || boxes <= 0) continue;
        for (const item of set.contents) {
            totals[item.part] = (totals[item.part] ?? 0) + item.qty * boxes;
        }
    }
    return totals;
}

/**
 * Pieces on the table per catalog part. One piece per placement; layouts
 * saved before every piece had a `placementId` are counted by shape (a
 * turnout's routes share their entry node, a crossing has two routes).
 */
export function countPlacedPieces(edges: Record<EdgeId, TrackEdge>): PartCounts {
    const seen = new Set<string>();
    const crossingEdges: PartCounts = {};
    const counts: PartCounts = {};
    for (const edge of Object.values(edges)) {
        let key: string;
        if (edge.placementId) {
            key = edge.placementId;
        } else {
            const type = getPartById(edge.partId)?.geometry.type;
            if (type === 'crossing') {
                crossingEdges[edge.partId] = (crossingEdges[edge.partId] ?? 0) + 1;
                continue;
            }
            key = type === 'switch' ? `${edge.partId}@${edge.startNodeId}` : edge.id;
        }
        if (seen.has(key)) continue;
        seen.add(key);
        counts[edge.partId] = (counts[edge.partId] ?? 0) + 1;
    }
    for (const [partId, n] of Object.entries(crossingEdges)) {
        counts[partId] = (counts[partId] ?? 0) + Math.ceil(n / 2);
    }
    return counts;
}

/** Pieces still in the box: owned minus on the table (never below zero). */
export function piecesLeft(inventory: PartCounts, placed: PartCounts): PartCounts {
    const left: PartCounts = {};
    for (const [partId, owned] of Object.entries(inventory)) {
        left[partId] = Math.max(0, owned - (placed[partId] ?? 0));
    }
    return left;
}

/** Parts a plan needs that the collection doesn't have: part → how many short. */
export function shortfall(need: PartCounts, have: PartCounts): PartCounts {
    const missing: PartCounts = {};
    for (const [partId, qty] of Object.entries(need)) {
        const short = qty - (have[partId] ?? 0);
        if (short > 0) missing[partId] = short;
    }
    return missing;
}

/** Format US cents as dollars. */
export function formatMoney(cents: number): string {
    const sign = cents < 0 ? '−' : '';
    return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}
