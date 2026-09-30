/**
 * Geometry properties, checked with fast-check over the whole catalog:
 *
 * - any angle normalises into [0, 360), congruent to the original;
 * - any piece attached to any connector of any piece, by any of its own
 *   connectors, meets it face to face;
 * - every boxed set's layout, built anywhere on the table at any angle,
 *   joins up exactly as it does at the origin.
 *
 * When one fails, fast-check shrinks it to the simplest case and prints the
 * seed to replay it.
 */

import { describe, expect } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { normalizeAngle } from '../../../utils/angle';
import { getAllParts } from '../../catalog';
import { getPartConnectors } from '../../catalog/helpers';
import { getAllSets, planToTemplate, resolvePlan } from '..';
import { loadRecipe, resetWorld } from '../../../simulation/harness';
import { useTrackStore } from '../../../stores/useTrackStore';
import { isOpenEnd } from '../../../utils/graphAnalysis';
import type { TrackTemplate } from '../../templates/types';
import type { LayoutPlan } from '../types';

describe('normalizeAngle', () => {
    test.prop([fc.double({ min: -1e6, max: 1e6, noNaN: true })])('lands in [0, 360), a whole number of turns away', (angle) => {
        const normal = normalizeAngle(angle);
        expect(normal).toBeGreaterThanOrEqual(0);
        expect(normal).toBeLessThan(360);
        const turns = (normal - angle) / 360;
        expect(Math.abs(turns - Math.round(turns))).toBeLessThan(1e-9);
        expect(normalizeAngle(normal)).toBe(normal);
    });
});

const parts = getAllParts();
/** A piece of the catalog and one of its connectors */
const pieceAndConnector = fc.constantFrom(...parts).chain(part =>
    fc.constantFrom(...getPartConnectors(part).nodes.map(n => n.localId)).map(connector => ({ part, connector })));

describe('mating', () => {
    test.prop([pieceAndConnector, pieceAndConnector])(
        'a piece attached to a connector meets it: same point, facing opposite ways',
        (base, attached) => {
            const plan: LayoutPlan = {
                id: 'mate',
                name: 'mate',
                steps: [
                    { part: base.part.id },
                    { part: attached.part.id, at: { piece: 0, connector: base.connector }, via: attached.connector },
                ],
            };
            const { joints } = resolvePlan(plan);
            const joint = joints.find(j => {
                const ends = [j.a, j.b].map(c => `${c.piece}:${c.connector}`).sort();
                return ends[0] === `0:${base.connector}` && ends[1] === `1:${attached.connector}`;
            });
            expect(joint, `${attached.part.id}.${attached.connector} on ${base.part.id}.${base.connector}`).toBeDefined();
            expect(joint!.gap).toBeLessThan(0.01);
        }
    );
});

/** The template moved `dx, dy` and turned `turn` degrees about the origin. */
function moved(template: TrackTemplate, turn: number, dx: number, dy: number): TrackTemplate {
    const r = (turn * Math.PI) / 180;
    return {
        ...template,
        parts: template.parts.map(p => ({
            ...p,
            position: {
                x: p.position.x * Math.cos(r) - p.position.y * Math.sin(r) + dx,
                y: p.position.x * Math.sin(r) + p.position.y * Math.cos(r) + dy,
            },
            rotation: normalizeAngle(p.rotation + turn),
        })),
    };
}

/** What a built layout is, joint for joint: pieces, joints, open ends and points. */
function shape() {
    const { nodes, edges } = useTrackStore.getState();
    const all = Object.values(nodes);
    return {
        edges: Object.keys(edges).length,
        nodes: all.length,
        openEnds: all.filter(isOpenEnd).length,
        points: all.filter(n => n.type === 'switch').length,
    };
}

const plans = getAllSets().flatMap(set => set.plans.map(plan => ({ id: `${set.id}/${plan.id}`, template: planToTemplate(plan) })));
const atOrigin = new Map(plans.map(({ id, template }) => {
    resetWorld();
    loadRecipe(template);
    return [id, shape()] as const;
}));

describe('closure', () => {
    test.prop(
        [fc.constantFrom(...plans), fc.double({ min: 0, max: 360, noNaN: true, maxExcluded: true }), fc.integer({ min: -5000, max: 5000 }), fc.integer({ min: -5000, max: 5000 })],
        { numRuns: 100 }
    )('a boxed set\'s layout built anywhere, at any angle, joins up as it does at the origin', (plan, turn, dx, dy) => {
        expect(atOrigin.get(plan.id)!.edges, plan.id).toBeGreaterThan(0);
        resetWorld();
        loadRecipe(moved(plan.template, turn, dx, dy));
        expect(shape(), plan.id).toEqual(atOrigin.get(plan.id));
    });
});
