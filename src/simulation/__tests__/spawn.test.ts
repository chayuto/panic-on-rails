import { describe, it, expect } from 'vitest';
import { pickSpawnLocation, spawnCandidates, standingSpot } from '../spawn';
import { lineGraph, straightEdge, train } from './fixtures';
import { fitsOnTrack, trainReach } from '../../utils/trainCars';

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

describe('standingSpot', () => {
    // The generic diesel and two coaches: 412 mm over couplers
    const diesel = { ...train('new', 'e0', 0), carLengths: [112, 150, 150], carriageCount: 3 };

    it('puts a train where every car stands on the track, its front at a buffer if need be', () => {
        // Two straights, 496 mm with an end at each side: no middle has room behind it
        const { edges, nodes } = lineGraph(2, 248);
        const spot = standingSpot(diesel, edges, edges, {}, nodes)!;
        expect(spot.edgeId).toBe('e1');
        // The front of the leading car at the buffer: its bogie a little short of it
        expect(248 - spot.distance).toBeCloseTo(trainReach(diesel).ahead, 6);
        expect(fitsOnTrack({ ...diesel, currentEdgeId: 'e1', distanceAlongEdge: 124 }, edges, nodes)).toBe(false);
    });

    it('finds no spot on track shorter than the train', () => {
        const { edges, nodes } = lineGraph(1, 247);
        expect(standingSpot(diesel, edges, edges, {}, nodes)).toBeNull();
    });

    it('takes the clearest spot where the train fits', () => {
        const { edges, nodes } = lineGraph(5, 300);
        expect(standingSpot(diesel, edges, edges, { t: train('t', 'e0', 50) }, nodes)).toEqual({ edgeId: 'e4', distance: 150 });
    });
});
