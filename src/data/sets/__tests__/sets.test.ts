/**
 * Authenticity checks for every boxed set: the contents are real catalog
 * parts, every plan in the manual closes with real geometry, uses only what
 * is in the box (plus the sets it extends), and runs a train cleanly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getAllSets, getAvailableParts, getSetById, resolvePlan, planToTemplate } from '..';
import type { PlacedConnector } from '../plan';
import { getPartById } from '../../catalog/registry';
import { resetWorld, loadRecipe, summarize, simHarness } from '../../../simulation/harness';

/** Kato Unitrack roadbed width (mm): footprints are measured to its edges. */
const ROADBED_WIDTH = 25;

const sets = getAllSets();
const plans = sets.flatMap(set => set.plans.map(plan => [`${set.id} ${plan.id}`, set, plan] as const));

const describeEnd = (c: PlacedConnector) =>
    `step ${c.piece} connector ${c.connector} at (${c.position.x.toFixed(1)}, ${c.position.y.toFixed(1)})`;

describe('boxed sets', () => {
    it('includes at least one starter set', () => {
        expect(sets.some(s => s.kind === 'starter')).toBe(true);
    });

    it.each(sets.map(s => [s.id, s] as const))('%s: contents are real catalog parts', (_id, set) => {
        expect(set.id).toBe(`${set.brand}-${set.productCode}`);
        const seen = new Set<string>();
        for (const item of set.contents) {
            const part = getPartById(item.part);
            expect(part, `unknown part ${item.part}`).toBeDefined();
            expect(part!.brand).toBe(set.brand);
            expect(seen.has(item.part), `${item.part} listed twice`).toBe(false);
            seen.add(item.part);
        }
        for (const base of set.extends ?? []) {
            expect(getSetById(base), `extends unknown set ${base}`).toBeDefined();
        }
    });

    describe.each(plans)('%s', (_name, set, plan) => {
        beforeEach(() => {
            resetWorld();
            simHarness.seed(1);
        });

        it('closes: no gaps beyond the declared open ends', () => {
            const { openEnds } = resolvePlan(plan);
            expect(openEnds.map(describeEnd)).toHaveLength(plan.openEnds ?? 0);
        });

        it('uses only pieces in the box and the sets it extends', () => {
            const available = getAvailableParts(set);
            for (const [part, used] of Object.entries(resolvePlan(plan).billOfMaterials)) {
                expect(used, `${part}: plan uses ${used}, boxes hold ${available[part] ?? 0}`)
                    .toBeLessThanOrEqual(available[part] ?? 0);
            }
        });

        it('runs its trains for 60 s without a crash', () => {
            expect(plan.trains?.length, 'every plan puts a train on the track').toBeGreaterThan(0);
            loadRecipe(planToTemplate(plan));
            const events = simHarness.runSeconds(60);
            expect(summarize().crashed).toBe(0);
            expect(events.filter(e => e.type === 'traverse').length).toBeGreaterThan(10);
        });
    });

    it.each(sets.map(s => [s.id, s] as const))('%s: the first plan uses every piece in the box', (_id, set) => {
        // With "only what's in the boxes" above, this makes a starter set's first plan exact
        const used = resolvePlan(set.plans[0]).billOfMaterials;
        for (const item of set.contents) {
            expect(used[item.part] ?? 0, item.part).toBeGreaterThanOrEqual(item.qty);
        }
    });

    it.each(sets.filter(s => s.footprint).map(s => [s.id, s] as const))(
        '%s: the first plan matches the footprint on the box',
        (_id, set) => {
            const { bounds } = resolvePlan(set.plans[0]);
            const width = bounds.maxX - bounds.minX + ROADBED_WIDTH;
            const depth = bounds.maxY - bounds.minY + ROADBED_WIDTH;
            const [long, short] = width >= depth ? [width, depth] : [depth, width];
            const [boxLong, boxShort] = [set.footprint!.width, set.footprint!.depth].sort((a, b) => b - a);
            expect(Math.abs(long - boxLong) / boxLong).toBeLessThan(0.05);
            expect(Math.abs(short - boxShort) / boxShort).toBeLessThan(0.05);
        }
    );
});
