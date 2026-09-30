/**
 * Collisions by the cars' real extent: any car of one train overlapping any
 * car of another, wherever the tracks run.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { detectCollisions, detectNearMisses, bodiesOverlap, type CarBody } from '../collisionManager';
import { useTrackStore } from '../../stores/useTrackStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { resetWorld } from '../../simulation/harness';
import type { Train } from '../../types';

const state = () => useTrackStore.getState();

/** Short cars, 48 mm over couplers (a 44 mm body), so the distances below are easy to follow. */
const SHORT_CAR = 48;

/** A train of `cars` short cars with its front at `distance` along `edgeId`, heading `direction`. */
function trainAt(edgeId: string, distance: number, direction: 1 | -1 = 1, cars = 1): string {
    const id = useSimulationStore.getState().spawnTrain(edgeId, undefined, cars, distance);
    const carLengths = Array<number>(cars).fill(SHORT_CAR);
    useSimulationStore.setState(s => ({ trains: { ...s.trains, [id]: { ...s.trains[id], direction, carLengths } } }));
    return id;
}

function collisions() {
    const { edges, nodes } = state();
    return detectCollisions(useSimulationStore.getState().trains, edges, nodes);
}

describe('detectCollisions', () => {
    beforeEach(() => {
        resetWorld();
        useSimulationStore.getState().clearTrains();
    });

    it('two trains on the same track collide when their cars touch, not before', () => {
        const edge = state().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!; // 248mm
        trainAt(edge, 60, 1);   // car from ~16 to ~60
        const far = trainAt(edge, 180, 1);
        expect(collisions()).toEqual([]);
        // Bring the second train's car back over the first's
        useSimulationStore.setState(s => ({ trains: { ...s.trains, [far]: { ...s.trains[far], distanceAlongEdge: 80 } } }));
        expect(collisions()).toHaveLength(1);
    });

    it('trains meeting on a crossing\'s diamond collide, though their tracks share no node', () => {
        state().addTrack('kato-20-320', { x: 0, y: 0 }, 0); // 90° crossing, 124mm each way
        const [a, b] = Object.values(state().edges);
        // Both fronts just past the middle of their track: the cars straddle the diamond
        trainAt(a.id, 75, 1);
        trainAt(b.id, 75, 1);
        const hits = collisions();
        expect(hits).toHaveLength(1);
        // Where they met: the middle of the crossing
        const middle = { x: (state().nodes[a.startNodeId].position.x + state().nodes[a.endNodeId].position.x) / 2 };
        expect(Math.abs(hits[0].location.x - middle.x)).toBeLessThan(30);
    });

    it('trains passing side by side on tracks at standard spacing don\'t touch', () => {
        const a = state().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const b = state().addTrack('kato-20-000', { x: 0, y: 33 }, 0)!; // Kato's double-track spacing
        trainAt(a, 200, 1, 3);
        trainAt(b, 200, -1, 3);
        expect(collisions()).toEqual([]);
    });

    it('a train that runs into a wreck collides with it', () => {
        const edge = state().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const live = trainAt(edge, 60, 1);
        const wreck = trainAt(edge, 70, -1);
        useSimulationStore.getState().setCrashed(wreck);
        const hits = collisions();
        expect(hits.map(h => [h.trainA.id, h.trainB.id].sort())).toEqual([[live, wreck].sort()]);
    });

    it('wrecks lying against each other are the crash that made them, not a new one', () => {
        const edge = state().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const a = trainAt(edge, 60, 1);
        const b = trainAt(edge, 70, -1);
        useSimulationStore.getState().setCrashed(a);
        useSimulationStore.getState().setCrashed(b);
        expect(collisions()).toEqual([]);
    });

    it('reports each pair of trains once, however many of their cars touch', () => {
        const edge = state().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        trainAt(edge, 240, 1, 4);
        trainAt(edge, 240, 1, 4); // the same place: every car overlaps
        expect(collisions()).toHaveLength(1);
    });
});

describe('detectNearMisses', () => {
    beforeEach(() => {
        resetWorld();
        useSimulationStore.getState().clearTrains();
    });

    const nearMisses = () => {
        const { edges, nodes } = state();
        return detectNearMisses(useSimulationStore.getState().trains, edges, nodes);
    };
    const moveTo = (id: string, distance: number) =>
        useSimulationStore.setState(s => ({ trains: { ...s.trains, [id]: { ...s.trains[id], distanceAlongEdge: distance } } }));

    it('a train a car\'s nose from another is a near miss; any nearer and they touch, which is a collision', () => {
        const edge = state().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const a = trainAt(edge, 60, 1);
        const b = trainAt(edge, 180, 1);
        expect(nearMisses()).toEqual([]);
        moveTo(b, 120);
        const [miss] = nearMisses();
        expect(miss.trainIds.sort()).toEqual([a, b].sort());
        expect(collisions()).toEqual([]);
        // Touching: a collision, not a near miss
        moveTo(b, 80);
        expect(collisions()).toHaveLength(1);
        expect(nearMisses()).toEqual([]);
    });

    it('trains passing on tracks at standard spacing are no near miss', () => {
        const a = state().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const b = state().addTrack('kato-20-000', { x: 0, y: 33 }, 0)!; // Kato's double-track spacing
        trainAt(a, 200, 1, 3);
        trainAt(b, 200, -1, 3);
        expect(nearMisses()).toEqual([]);
    });

    it('two trains standing close together are no near miss: one must be moving', () => {
        const edge = state().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const a = trainAt(edge, 60, 1);
        const b = trainAt(edge, 120, 1);
        for (const id of [a, b]) useSimulationStore.getState().setTrainStopped(id, true);
        expect(nearMisses()).toEqual([]);
        // One pulls away
        useSimulationStore.getState().setTrainStopped(a, false);
        useSimulationStore.setState(s => ({ trains: { ...s.trains, [a]: { ...s.trains[a], speed: 100 } } }));
        expect(nearMisses()).toHaveLength(1);
    });
});

describe('bodiesOverlap', () => {
    const body = (cx: number, cy: number, degrees: number): CarBody => {
        const r = (degrees * Math.PI) / 180;
        return { train: {} as Train, cx, cy, ux: Math.cos(r), uy: Math.sin(r), halfLength: 20, halfWidth: 6, reach: Math.hypot(20, 6) };
    };

    it('separates rectangles by any of their axes', () => {
        expect(bodiesOverlap(body(0, 0, 0), body(39, 0, 0))).toBe(true);   // end to end, overlapping by 1
        expect(bodiesOverlap(body(0, 0, 0), body(41, 0, 0))).toBe(false);
        expect(bodiesOverlap(body(0, 0, 0), body(0, 13, 0))).toBe(false);  // side by side, 1mm apart
        // Crossed at 90° through each other's middle
        expect(bodiesOverlap(body(0, 0, 0), body(0, 0, 90))).toBe(true);
        // Diagonal, clear of the corner
        expect(bodiesOverlap(body(0, 0, 0), body(30, 25, 45))).toBe(false);
    });
});
