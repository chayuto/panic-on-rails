import { describe, it, expect, beforeEach } from 'vitest';
import { canJoin, hasClosedLoop, isInsidePiece, isOpenEnd } from '../graphAnalysis';
import { node } from '../../simulation/__tests__/fixtures';
import { useTrackStore } from '../../stores/useTrackStore';
import { resetWorld, loadRecipe } from '../../simulation/harness';
import { lineGraph, straightEdge } from '../../simulation/__tests__/fixtures';
import { loadTemplateJson } from '../../simulation/__tests__/fixtures';

describe('hasClosedLoop', () => {
    beforeEach(() => resetWorld());

    it('is false for no track and for an open line', () => {
        expect(hasClosedLoop({})).toBe(false);
        expect(hasClosedLoop(lineGraph(6).edges)).toBe(false);
    });

    it('is true once the line closes back on itself', () => {
        const { edges } = lineGraph(3);
        edges.back = straightEdge('back', 'n3', 'n0', 0, 100);
        expect(hasClosedLoop(edges)).toBe(true);
    });

    it.each(['simple-oval', 'wooden-starter', 'crossover-express'])('%s has a loop', (id) => {
        loadRecipe(loadTemplateJson(id));
        expect(hasClosedLoop(useTrackStore.getState().edges)).toBe(true);
    });

    it('switch-showdown\'s passing loop counts as a loop', () => {
        loadRecipe(loadTemplateJson('switch-showdown'));
        expect(hasClosedLoop(useTrackStore.getState().edges)).toBe(true);
    });

    it('four unconnected straights are not a loop', () => {
        for (let i = 0; i < 4; i++) useTrackStore.getState().addTrack('kato-20-000', { x: 0, y: i * 100 }, 0);
        expect(hasClosedLoop(useTrackStore.getState().edges)).toBe(false);
    });
});

describe('open ends', () => {
    const points = (connections: string[]) =>
        node('p', 0, connections, { type: 'switch', switchState: 0, switchBranches: ['main', 'branch'] });

    it('a plain end and points with nothing beyond them are open; a buffer stop is not', () => {
        expect(isOpenEnd(node('a', 0, ['e']))).toBe(true);
        expect(isOpenEnd(node('a', 0, ['e'], { bumper: true }))).toBe(false);
        expect(isOpenEnd(points(['main', 'branch']))).toBe(true);
        expect(isOpenEnd(points(['main', 'branch', 'lead']))).toBe(false);
        expect(isOpenEnd(node('j', 0, ['e', 'f'], { type: 'junction' }))).toBe(false);
    });

    it('never joins two sets of points into one node', () => {
        const other = { ...points(['x', 'y']), id: 'q', switchBranches: ['x', 'y'] as [string, string] };
        expect(canJoin(points(['main', 'branch']), node('a', 0, ['e']))).toBe(true);
        expect(canJoin(points(['main', 'branch']), other)).toBe(false);
    });

    it('a joint inside one piece is not a joint between pieces', () => {
        const edges = {
            a: { ...straightEdge('a', 'n0', 'n1', 0, 50), placementId: 'piece' },
            b: { ...straightEdge('b', 'n1', 'n2', 50, 50), placementId: 'piece' },
            c: { ...straightEdge('c', 'n2', 'n3', 100, 50), placementId: 'other' },
        };
        expect(isInsidePiece(node('n1', 50, ['a', 'b'], { type: 'junction' }), edges)).toBe(true);
        expect(isInsidePiece(node('n2', 100, ['b', 'c'], { type: 'junction' }), edges)).toBe(false);
    });
});
