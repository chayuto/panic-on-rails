import { describe, it, expect } from 'vitest';
import { pickSpawnLocation, spawnCandidates } from '../spawn';
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
        const { edges, nodes } = lineGraph(5, 100);
        expect(pickSpawnLocation(edges, { t: train('t', 'e0', 10) }, nodes)!.edgeId).toBe('e4');
        expect(pickSpawnLocation(edges, { t: train('t', 'e4', 90) }, nodes)!.edgeId).toBe('e0');
    });

    it('never stacks a second train on the first', () => {
        const { edges, nodes } = lineGraph(3, 100);
        const first = pickSpawnLocation(edges, {}, nodes)!;
        const second = pickSpawnLocation(edges, { t: train('t', first.edgeId, first.distance) }, nodes)!;
        expect(second.edgeId).not.toBe(first.edgeId);
    });

    it('keeps clear of wrecks: they block the track', () => {
        const { edges, nodes } = lineGraph(3, 100);
        const wreck = { ...train('t', 'e0', 50), crashed: true };
        expect(pickSpawnLocation(edges, { t: wreck }, nodes)!.edgeId).toBe('e2');
    });
});

describe('spawnCandidates', () => {
    it('ranks every edge\'s middle, the clearest first', () => {
        const { edges, nodes } = lineGraph(4, 100);
        const spots = spawnCandidates(edges, { t: train('t', 'e0', 50) }, nodes);
        expect(spots.map(s => s.edgeId)).toEqual(['e3', 'e2', 'e1', 'e0']);
        expect(spots.every(s => s.distance === 50)).toBe(true);
    });
});
