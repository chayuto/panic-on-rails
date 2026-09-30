/**
 * Elevation: track raised on piers. Ends join only at the same height, a
 * piece set down against raised track is lifted to meet it, and trains at
 * different levels pass over and under each other.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { gradeOf, heightAlong, heightOf, sameHeight } from '../elevation';
import { canJoin } from '../graphAnalysis';
import { joinPlacedPiece } from '../joinPiece';
import { validateConnection } from '../connectTransform';
import { detectCollisions } from '../collisionManager';
import { useTrackStore } from '../../stores/useTrackStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { resetWorld } from '../../simulation/harness';
import type { TrackEdge, TrackNode } from '../../types';

const state = () => useTrackStore.getState();

/** A 248 mm straight at (x, y) heading `rotation`, raised to `height` at both ends. */
function straight(x: number, y: number, rotation = 0, height = 0): string {
    const id = state().addTrack('kato-20-000', { x, y }, rotation)!;
    const edge = state().edges[id];
    if (height > 0) state().setNodeHeights({ [edge.startNodeId]: height, [edge.endNodeId]: height });
    return id;
}

const ends = (edgeId: string): [TrackNode, TrackNode] => {
    const { edges, nodes } = state();
    return [nodes[edges[edgeId].startNodeId], nodes[edges[edgeId].endNodeId]];
};

describe('heights', () => {
    it('rise evenly along a piece between two heights: a grade', () => {
        const nodes = { a: { height: 10 } as TrackNode, b: {} as TrackNode };
        const edge = { startNodeId: 'b', endNodeId: 'a', length: 250 } as TrackEdge;
        expect(heightOf(nodes.b)).toBe(0);
        expect(heightAlong(edge, 125, nodes)).toBe(5);
        expect(gradeOf(edge, nodes)).toBeCloseTo(0.04, 9);
        expect(sameHeight({ height: 60 }, { height: 60.3 })).toBe(true);
        expect(sameHeight({ height: 60 }, {})).toBe(false);
    });
});

describe('joining raised track', () => {
    beforeEach(() => resetWorld());

    it('joins ends only at the same height', () => {
        const low = straight(0, 0);
        const high = straight(248, 0, 0, 60);
        const [, lowEnd] = ends(low);
        const [highStart] = ends(high);
        expect(canJoin(lowEnd, highStart)).toBe(false);
        expect(validateConnection(lowEnd, highStart, state().edges)).toMatchObject({ isValid: false, error: 'The two ends are at different heights' });
        state().setNodeHeights({ [lowEnd.id]: 60, [ends(low)[0].id]: 60 });
        expect(canJoin(ends(low)[1], ends(high)[0])).toBe(true);
    });

    it('lifts a piece set down against raised track to meet it, and joins it there', () => {
        const high = straight(0, 0, 0, 60);
        const placed = straight(248, 0);
        expect(joinPlacedPiece(placed)).toBe(1);
        const [start, end] = ends(placed);
        expect(heightOf(start)).toBe(60);
        expect(heightOf(end)).toBe(60);
        // It joined the raised piece's end: one node between them
        expect(start.connections).toHaveLength(2);
        expect(ends(high)[1].id).toBe(start.id);
    });

    it('leaves a piece on the baseboard when it touches nothing raised', () => {
        straight(0, 0);
        const placed = straight(248, 0);
        expect(joinPlacedPiece(placed)).toBe(1);
        expect(ends(placed).map(heightOf)).toEqual([0, 0]);
    });
});

describe('trains at different levels', () => {
    beforeEach(() => {
        resetWorld();
        useSimulationStore.getState().clearTrains();
    });

    /** Two straights crossing at right angles, their middles at (124, 0); one at `height`. */
    function crossing(height: number) {
        const across = straight(0, 0);
        const over = straight(124, -124, 90, height);
        const sim = useSimulationStore.getState();
        const a = sim.spawnTrain(across, undefined, 1, 160);
        const b = sim.spawnTrain(over, undefined, 1, 160);
        return { a, b };
    }

    it('collide where their tracks cross at the same level', () => {
        crossing(0);
        const { edges, nodes } = state();
        expect(detectCollisions(useSimulationStore.getState().trains, edges, nodes)).toHaveLength(1);
    });

    it('pass over and under each other on a bridge', () => {
        crossing(60);
        const { edges, nodes } = state();
        expect(detectCollisions(useSimulationStore.getState().trains, edges, nodes)).toEqual([]);
    });
});
