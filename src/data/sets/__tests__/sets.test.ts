/**
 * Authenticity checks for every boxed set: the contents are real catalog
 * parts, every plan in the manual closes with real geometry, uses only what
 * is in the box (plus the sets it extends), and runs a train cleanly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getAllSets, getAvailableParts, getSetById, resolvePlan, planToTemplate } from '..';
import type { PlacedConnector } from '../plan';
import type { LayoutPlan } from '../types';
import { getPartById } from '../../catalog/registry';
import { createPartTrack } from '../../../stores/slices/trackCreators';
import { resetWorld, loadRecipe, summarize, simHarness } from '../../../simulation/harness';

/**
 * Outer size of a plan as a manufacturer measures it: every edge swept by
 * its part's footprint width (roadbed, road-crossing plates, ...).
 */
function footprint(plan: LayoutPlan): { long: number; short: number } {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const piece of resolvePlan(plan).pieces) {
        const half = (piece.part.width ?? 25) / 2;
        for (const { geometry: g } of createPartTrack(piece.part, piece.position, piece.rotation).edges) {
            for (let i = 0; i <= 64; i++) {
                const t = i / 64;
                if (g.type === 'straight') {
                    const heading = Math.atan2(g.end.y - g.start.y, g.end.x - g.start.x);
                    const x = g.start.x + (g.end.x - g.start.x) * t;
                    const y = g.start.y + (g.end.y - g.start.y) * t;
                    xs.push(x - Math.sin(heading) * half, x + Math.sin(heading) * half);
                    ys.push(y + Math.cos(heading) * half, y - Math.cos(heading) * half);
                } else {
                    const a = ((g.startAngle + (g.endAngle - g.startAngle) * t) * Math.PI) / 180;
                    for (const r of [g.radius - half, g.radius + half]) {
                        xs.push(g.center.x + r * Math.cos(a));
                        ys.push(g.center.y + r * Math.sin(a));
                    }
                }
            }
        }
    }
    const width = Math.max(...xs) - Math.min(...xs);
    const depth = Math.max(...ys) - Math.min(...ys);
    return { long: Math.max(width, depth), short: Math.min(width, depth) };
}

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
        for (const spare of set.spares ?? []) {
            const inBox = set.contents.find(i => i.part === spare.part)?.qty ?? 0;
            expect(spare.qty, `spare ${spare.part} must be in the box`).toBeLessThanOrEqual(inBox);
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
            const spare = set.spares?.find(s => s.part === item.part)?.qty ?? 0;
            expect(used[item.part] ?? 0, item.part).toBeGreaterThanOrEqual(item.qty - spare);
        }
    });

    // A starter's first plan is the box itself, so it must measure what the box says
    it.each(sets.filter(s => s.kind === 'starter' && s.footprint).map(s => [s.id, s] as const))(
        '%s: the first plan measures what is printed on the box',
        (_id, set) => {
            const { long, short } = footprint(set.plans[0]);
            const [boxLong, boxShort] = [set.footprint!.width, set.footprint!.depth].sort((a, b) => b - a);
            expect(Math.abs(long - boxLong) / boxLong, `long side ${long.toFixed(1)} vs ${boxLong}`).toBeLessThan(0.015);
            expect(Math.abs(short - boxShort) / boxShort, `short side ${short.toFixed(1)} vs ${boxShort}`).toBeLessThan(0.015);
        }
    );
});
