/**
 * Layout plan builder: chains of real parts become exact placements.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import '../../catalog';
import { resolvePlan, planToTemplate, PlanError, throughExit } from '../plan';
import { getPartById } from '../../catalog/registry';
import type { LayoutPlan } from '../types';
import { resetWorld, loadRecipe, summarize, simHarness } from '../../../simulation/harness';
import { useTrackStore } from '../../../stores/useTrackStore';

const S248 = 'kato-20-000';
const S124 = 'kato-20-020';
const S62 = 'kato-20-040';
const R315 = 'kato-20-120';
const R718 = 'kato-20-150';
const TURNOUT_6L = 'kato-20-202';

const side = [S248, S248, S124, S62];
const end = [R315, R315, R315, R315];

/** Kato M1: 682 mm straights each side, R315 ends. */
const oval: LayoutPlan = {
    id: 'test-oval',
    name: 'Test oval',
    steps: [...side, ...end, ...side, ...end].map(part => ({ part })),
    trains: [{ piece: 0 }],
};

describe('resolvePlan', () => {
    it('closes a Kato M1-sized oval exactly, with no open ends', () => {
        const plan = resolvePlan(oval);
        expect(plan.openEnds).toEqual([]);
        // 16 pieces in a ring meet at 16 joints, the last one closing the loop
        expect(plan.joints).toHaveLength(16);
        for (const joint of plan.joints) expect(joint.gap).toBeLessThan(0.01);
    });

    it('measures the M1 oval at 682 + 2×315 mm by 2×315 mm between track centres', () => {
        const { bounds } = resolvePlan(oval);
        expect(bounds.maxX - bounds.minX).toBeCloseTo(682 + 630, 1);
        expect(bounds.maxY - bounds.minY).toBeCloseTo(630, 1);
    });

    it('counts the pieces used', () => {
        expect(resolvePlan(oval).billOfMaterials).toEqual({ [S248]: 4, [S124]: 2, [S62]: 2, [R315]: 8 });
    });

    it('turns right from A and left when a curve is attached via B', () => {
        const right = resolvePlan({ id: 'r', name: 'r', steps: [{ part: S248 }, { part: R315 }] });
        const left = resolvePlan({ id: 'l', name: 'l', steps: [{ part: S248 }, { part: R315, via: 'B' }] });
        const exitOf = (p: typeof right) => p.pieces[1].connectors.find(c => c.connector !== p.pieces[1].via)!;
        // +Y is down on screen: a right turn ends below the straight, a left turn above
        expect(exitOf(right).position.y).toBeGreaterThan(50);
        expect(exitOf(left).position.y).toBeLessThan(-50);
        expect(exitOf(right).facade).toBeCloseTo(45, 5);
        expect(exitOf(left).facade).toBeCloseTo(315, 5);
    });

    it('attaches to a named connector, e.g. a turnout branch', () => {
        const plan = resolvePlan({
            id: 'branch',
            name: 'branch',
            steps: [
                { part: TURNOUT_6L },
                { part: S248 },                                          // through the main route
                // The branch heads 15° left; a right-hand R718-15 brings it back parallel
                { part: R718, at: { piece: 0, connector: 'branch' } },
            ],
        });
        const turnout = plan.pieces[0];
        const branch = turnout.connectors.find(c => c.connector === 'branch')!;
        const curveVia = plan.pieces[2].connectors.find(c => c.connector === 'A')!;
        expect(curveVia.position.x).toBeCloseTo(branch.position.x, 6);
        expect(curveVia.position.y).toBeCloseTo(branch.position.y, 6);
        const curveExit = plan.pieces[2].connectors.find(c => c.connector === 'B')!;
        expect(curveExit.facade).toBeCloseTo(0, 5);
        // #6 geometry: two R718-15° arcs put the siding 2·718·(1−cos 15°) ≈ 48.9 mm off the main
        expect(curveExit.position.y).toBeCloseTo(-2 * 718 * (1 - Math.cos(Math.PI / 12)), 3);
    });

    it('starts a parallel run alongside an earlier piece (Kato V5 inner oval, 33 mm inside)', () => {
        const R282 = 'kato-20-110';
        const inner = [...side, ...[R282, R282, R282, R282], ...side, ...[R282, R282, R282, R282]];
        const plan = resolvePlan({
            id: 'double',
            name: 'double',
            steps: [
                ...oval.steps,
                { part: inner[0], at: { alongside: 0, offset: 33 } },
                ...inner.slice(1).map(part => ({ part })),
            ],
        });
        expect(plan.openEnds).toEqual([]);
        expect(plan.joints).toHaveLength(32);
        const innerStart = plan.pieces[16].connectors.find(c => c.connector === 'A')!;
        // Right of an eastbound track is +Y (south), i.e. inside the clockwise oval
        expect(innerStart.position).toEqual({ x: expect.closeTo(0, 6), y: expect.closeTo(33, 6) });
        const innerXs = plan.pieces.slice(16).flatMap(p => p.connectors.map(c => c.position.x));
        expect(Math.max(...innerXs) - Math.min(...innerXs)).toBeCloseTo(682 + 2 * 282, 1);
    });

    it('rejects an alongside reference to a later step', () => {
        expect(() => resolvePlan({
            id: 'bad', name: 'x', steps: [{ part: S248 }, { part: S248, at: { alongside: 3, offset: 33 } }],
        })).toThrow(/step 1: alongside piece 3 is not an earlier step/);
    });

    it('follows the through route of turnouts and crossings by default', () => {
        const turnout = getPartById(TURNOUT_6L)!;
        expect(throughExit(turnout, 'entry')).toBe('main');
        expect(throughExit(turnout, 'branch')).toBe('entry');
        expect(throughExit(getPartById('kato-20-320')!, 'B1')).toBe('B2');
        expect(throughExit(getPartById(S248)!, 'B')).toBe('A');
    });

    it('reports mistakes with the plan id and step', () => {
        expect(() => resolvePlan({ id: 'bad', name: 'x', steps: [{ part: 'nope' }] }))
            .toThrow(new PlanError({ id: 'bad', name: 'x', steps: [] }, 0, 'unknown part "nope"'));
        expect(() => resolvePlan({ id: 'bad', name: 'x', steps: [{ part: S248 }, { part: S248, via: 'Z' }] }))
            .toThrow(/step 1: kato-20-000 has no connector "Z"/);
        expect(() => resolvePlan({ id: 'bad', name: 'x', steps: [{ part: S248 }, { part: S248, at: { piece: 0, connector: 'Q' } }] }))
            .toThrow(/step 1: piece 0 has no connector "Q"/);
        expect(() => resolvePlan({ id: 'bad', name: 'x', steps: [{ part: S248 }, { part: S248, at: 5 }] }))
            .toThrow(/step 1: anchor piece 5 is not an earlier step/);
    });
});

describe('planToTemplate', () => {
    beforeEach(() => {
        resetWorld();
        simHarness.seed(1);
    });

    it('builds through the real track store into one closed loop that a train can run', () => {
        const template = planToTemplate(oval);
        expect(template.parts).toHaveLength(16);
        // Placed on the table with a margin, not around the origin
        for (const p of template.parts) {
            expect(p.position.x).toBeGreaterThan(0);
            expect(p.position.y).toBeGreaterThan(0);
        }

        loadRecipe(template);
        const nodes = Object.values(useTrackStore.getState().nodes);
        expect(nodes.filter(n => n.connections.length !== 2)).toEqual([]);

        const events = simHarness.runSeconds(30);
        expect(summarize().crashed).toBe(0);
        expect(events.filter(e => e.type === 'bounce')).toHaveLength(0);
        expect(events.filter(e => e.type === 'traverse').length).toBeGreaterThan(5);
    });
});
