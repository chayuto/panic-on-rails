import { describe, it, expect } from 'vitest';
import { pickSpawnLocation } from '../spawn';
import { lineGraph, straightEdge, train } from './fixtures';

describe('pickSpawnLocation', () => {
    it('returns null with no track', () => {
        expect(pickSpawnLocation({}, {})).toBeNull();
    });

    it('with no trains, picks the middle of the longest edge', () => {
        const edges = { a: straightEdge('a', 'n0', 'n1', 0, 100), b: straightEdge('b', 'n1', 'n2', 100, 300) };
        expect(pickSpawnLocation(edges, {})).toEqual({ edgeId: 'b', distance: 150 });
    });

    it('spawns as far as possible from existing trains', () => {
        const { edges } = lineGraph(5, 100);
        expect(pickSpawnLocation(edges, { t: train('t', 'e0', 10) })!.edgeId).toBe('e4');
        expect(pickSpawnLocation(edges, { t: train('t', 'e4', 90) })!.edgeId).toBe('e0');
    });

    it('never stacks a second train on the first', () => {
        const { edges } = lineGraph(3, 100);
        const first = pickSpawnLocation(edges, {})!;
        const second = pickSpawnLocation(edges, { t: train('t', first.edgeId, first.distance) })!;
        expect(second.edgeId).not.toBe(first.edgeId);
    });

    it('ignores crashed trains', () => {
        const { edges } = lineGraph(3, 100);
        const wreck = { ...train('t', 'e0', 50), crashed: true };
        expect(pickSpawnLocation(edges, { t: wreck })!.edgeId).toBe('e0');
    });
});
