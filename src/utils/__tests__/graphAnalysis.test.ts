import { describe, it, expect, beforeEach } from 'vitest';
import { hasClosedLoop } from '../graphAnalysis';
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
