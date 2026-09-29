/**
 * Boxed sets registry.
 *
 * Every `src/data/sets/<brand>/*.json` file is one real product. Files are
 * picked up automatically and validated on load; see ./README.md to add one.
 */

import '../catalog';
import { TrackSetSchema } from './schema';
import type { TrackSet } from './types';

const files = import.meta.glob<{ default: unknown }>('./*/*.json', { eager: true });

function loadSets(): TrackSet[] {
    const sets = Object.entries(files).map(([path, mod]) => {
        const result = TrackSetSchema.safeParse(mod.default);
        if (!result.success) {
            const issue = result.error.issues[0];
            throw new Error(`Invalid set file ${path}: ${issue?.message} at ${issue?.path.join('.')}`);
        }
        return result.data as TrackSet;
    });
    // Starter sets first, then by product code — the order of a shop shelf
    return sets.sort((a, b) =>
        (a.kind === b.kind ? 0 : a.kind === 'starter' ? -1 : 1)
        || a.productCode.localeCompare(b.productCode, undefined, { numeric: true }));
}

const SETS = loadSets();
const BY_ID = new Map(SETS.map(s => [s.id, s]));

export function getAllSets(): TrackSet[] {
    return SETS;
}

export function getSetById(id: string): TrackSet | undefined {
    return BY_ID.get(id);
}

/**
 * Parts available to a set's plans: its own contents plus everything in the
 * sets it extends (recursively), e.g. a V1 plan may use the M1 oval.
 */
export function getAvailableParts(set: TrackSet): Record<string, number> {
    const totals: Record<string, number> = {};
    const seen = new Set<string>();
    const visit = (s: TrackSet) => {
        if (seen.has(s.id)) return;
        seen.add(s.id);
        for (const item of s.contents) totals[item.part] = (totals[item.part] ?? 0) + item.qty;
        for (const id of s.extends ?? []) {
            const base = BY_ID.get(id);
            if (base) visit(base);
        }
    };
    visit(set);
    return totals;
}

export type { TrackSet, LayoutPlan, PlanStep, PlanAnchor, PlanAlongside, PlanTrain, SetKind, SetContentItem } from './types';
export { resolvePlan, planToTemplate, throughExit, PlanError } from './plan';
export type { ResolvedPlan, PlacedPiece, PlacedConnector, PlanJoint } from './plan';
