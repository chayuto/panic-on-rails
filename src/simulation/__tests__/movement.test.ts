import { describe, it, expect } from 'vitest';
import { calculateTrainMovement, SIGNAL_STOP_GAP } from '../movement';
import { lineGraph, node, straightEdge, train } from './fixtures';

describe('calculateTrainMovement', () => {
    const { edges, nodes } = lineGraph(3, 100);

    it('advances along the current edge by speed × dt', () => {
        const u = calculateTrainMovement(train('t', 'e0', 10), 0.5, edges, nodes)!;
        expect(u).toMatchObject({ edgeId: 'e0', distance: 60, direction: 1, bounced: false });
    });

    it('moves backwards when direction is -1', () => {
        const u = calculateTrainMovement(train('t', 'e1', 80, -1), 0.5, edges, nodes)!;
        expect(u).toMatchObject({ edgeId: 'e1', distance: 30, direction: -1 });
    });

    it('carries overflow onto the next edge', () => {
        const u = calculateTrainMovement(train('t', 'e0', 90), 0.2, edges, nodes)!;
        expect(u).toMatchObject({ edgeId: 'e1', distance: 10, direction: 1 });
    });

    it('crosses several short edges in one large step', () => {
        const u = calculateTrainMovement(train('t', 'e0', 0), 2.5, edges, nodes)!;
        expect(u).toMatchObject({ edgeId: 'e2', distance: 50 });
    });

    it('bounces at a dead end and reflects the overflow', () => {
        const u = calculateTrainMovement(train('t', 'e2', 95), 0.1, edges, nodes)!;
        expect(u).toMatchObject({ edgeId: 'e2', distance: 95, direction: -1, bounced: true });
    });

    it('enters a reversed edge from its end with direction -1', () => {
        // e1 is stored backwards: start n2, end n1
        const e = { e0: straightEdge('e0', 'a', 'b', 0, 100), e1: straightEdge('e1', 'c', 'b', 100, 100) };
        const n = { a: node('a', 0, ['e0']), b: node('b', 100, ['e0', 'e1']), c: node('c', 200, ['e1']) };
        const u = calculateTrainMovement(train('t', 'e0', 95), 0.1, e, n)!;
        expect(u).toMatchObject({ edgeId: 'e1', distance: 95, direction: -1 });
    });

    it('returns null for a train on a missing edge', () => {
        expect(calculateTrainMovement(train('t', 'nope', 0), 0.1, edges, nodes)).toBeNull();
    });

    describe('at a switch (facing point)', () => {
        // in —→ S ─main→ m
        //          └branch→ b
        const e = {
            in: straightEdge('in', 'a', 'S', 0, 100),
            main: straightEdge('main', 'S', 'm', 100, 100),
            branch: straightEdge('branch', 'S', 'b', 100, 100),
        };
        const sw = (state: 0 | 1) => ({
            a: node('a', 0, ['in']),
            S: node('S', 100, ['in', 'main', 'branch'], { type: 'switch', switchState: state, switchBranches: ['main', 'branch'] }),
            m: node('m', 200, ['main']),
            b: node('b', 200, ['branch']),
        });

        it('follows the main route when switchState is 0', () => {
            expect(calculateTrainMovement(train('t', 'in', 95), 0.1, e, sw(0))!.edgeId).toBe('main');
        });

        it('follows the branch route when switchState is 1', () => {
            expect(calculateTrainMovement(train('t', 'in', 95), 0.1, e, sw(1))!.edgeId).toBe('branch');
        });

        it('trailing moves from the branch always exit to the entry edge', () => {
            const u = calculateTrainMovement(train('t', 'branch', 5, -1), 0.1, e, sw(0))!;
            expect(u.edgeId).toBe('in');
        });

        it('treats points with nothing joined beyond them as a dead end, not a hairpin', () => {
            const open = { ...sw(1), S: node('S', 100, ['main', 'branch'], { type: 'switch', switchState: 1, switchBranches: ['main', 'branch'] }) };
            const u = calculateTrainMovement(train('t', 'main', 5, -1), 0.1, e, open)!;
            expect(u).toMatchObject({ edgeId: 'main', direction: 1, bounced: true });
        });
    });

    describe('red signals', () => {
        const red = (...ids: string[]) => new Set(ids);

        it('stops a train at the stop line before a red node', () => {
            const u = calculateTrainMovement(train('t', 'e0', 50), 1, edges, nodes, red('n1'))!;
            expect(u).toMatchObject({ edgeId: 'e0', distance: 100 - SIGNAL_STOP_GAP, held: true });
        });

        it('holds a train that is already standing at the stop line', () => {
            const u = calculateTrainMovement(train('t', 'e0', 100 - SIGNAL_STOP_GAP), 0.5, edges, nodes, red('n1'))!;
            expect(u).toMatchObject({ distance: 100 - SIGNAL_STOP_GAP, held: true });
        });

        it('stops a reversing train before a red node behind it', () => {
            const u = calculateTrainMovement(train('t', 'e1', 60, -1), 1, edges, nodes, red('n1'))!;
            expect(u).toMatchObject({ edgeId: 'e1', distance: SIGNAL_STOP_GAP, held: true });
        });

        it('lets a train past the stop line run through (too late to stop)', () => {
            const u = calculateTrainMovement(train('t', 'e0', 95), 0.1, edges, nodes, red('n1'))!;
            expect(u).toMatchObject({ edgeId: 'e1', held: false });
        });

        it('stops on a later edge within the same large step', () => {
            const u = calculateTrainMovement(train('t', 'e0', 50), 3, edges, nodes, red('n2'))!;
            expect(u).toMatchObject({ edgeId: 'e1', distance: 100 - SIGNAL_STOP_GAP, held: true });
        });

        it('ignores red signals at nodes the train is not heading into', () => {
            const u = calculateTrainMovement(train('t', 'e1', 50), 0.2, edges, nodes, red('n1'))!;
            expect(u).toMatchObject({ edgeId: 'e1', distance: 70, held: false });
        });
    });
});

