/**
 * Wreckage: a crashed train blocks the track until the player clears it,
 * and re-railing puts it back, repaired, somewhere clear.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { rerail } from '../wreckage';
import { spawnCandidates } from '../spawn';
import { lineGraph, train } from './fixtures';
import { resetWorld, loadSetPlan, summarize } from '../harness';
import { runSimulation, seedSimulation } from '../tick';
import { rerailWrecks, spawnTrainAtClearestSpot, startSimulation } from '../controls';
import { detectCollisions } from '../../utils/collisionManager';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import type { Train } from '../../types';

const wreck = (id: string, edgeId: string, distance: number): Train =>
    ({ ...train(id, edgeId, distance), crashed: true, crashTime: 5, speed: 0 });

describe('rerail', () => {
    it('puts a wreck back at the clearest spot, standing, clear of the other wreck', () => {
        const { edges, nodes } = lineGraph(4, 100);
        const trains = { a: wreck('a', 'e1', 40), b: wreck('b', 'e1', 60) };
        const placed = rerail(trains.a, trains, edges, nodes)!;
        expect(placed).toMatchObject({ id: 'a', currentEdgeId: 'e3', distanceAlongEdge: 50, direction: 1, speed: 0, stopped: true });
        expect(placed.crashed).toBeUndefined();
        expect(placed.crashTime).toBeUndefined();
    });

    it('keeps the driver\'s throttle; the loco leads again, and the trail starts afresh', () => {
        const { edges, nodes } = lineGraph(4, 100);
        const a = {
            ...wreck('a', 'e0', 40), throttle: 150, locoLeading: false, reverseRequested: true, heldAtSignal: true, trail: ['e9'],
            // Crashed while standing at a platform
            dwell: 3, calledAt: 's', ride: 900,
        };
        const placed = rerail(a, { a }, edges, nodes)!;
        expect(placed.throttle).toBe(150);
        for (const key of ['locoLeading', 'reverseRequested', 'heldAtSignal', 'trail', 'dwell', 'calledAt', 'ride'] as const) {
            expect(placed[key]).toBeUndefined();
        }
    });

    it('passes over spots where another train\'s cars stand', () => {
        const { edges, nodes } = lineGraph(5, 100);
        // A long train with its front at x=150, heading west: its cars fill the track east of it
        const long: Train = { ...train('c', 'e1', 50, -1), carriageCount: 7, carriageSpacing: 50, speed: 0, stopped: true };
        const a = wreck('a', 'e0', 20);
        // The clearest spot counts every car, not only the front: it isn't under them
        expect(spawnCandidates(edges, { c: long }, nodes)[0].edgeId).toBe('e0');
        const placed = rerail(a, { a, c: long }, edges, nodes)!;
        expect(placed.currentEdgeId).toBe('e0');
        expect(detectCollisions({ a: placed, c: long }, edges, nodes)).toEqual([]);
    });

    it('needs track under every car: a wreck longer than the track isn\'t put back', () => {
        // The starter diesel and its coaches, 412 mm, and one 247 mm piece
        const long = { ...wreck('a', 'e0', 100), carLengths: [112, 150, 150], carriageCount: 3 };
        const short = lineGraph(1, 247);
        expect(rerail(long, { a: long }, short.edges, short.nodes)).toBeNull();
        const room = lineGraph(3, 248);
        expect(rerail(long, { a: long }, room.edges, room.nodes)).not.toBeNull();
    });

    it('gives up when there\'s nowhere it fits', () => {
        const { edges, nodes } = lineGraph(1, 100);
        const trains = { a: wreck('a', 'e0', 40), b: wreck('b', 'e0', 60) };
        expect(rerail(trains.a, trains, edges, nodes)).toBeNull();
    });
});

describe('wrecks on a layout', () => {
    beforeEach(() => {
        resetWorld();
        seedSimulation(3);
        // Free build: as many trains as the test wants
        useCollectionStore.getState().setMode('free');
        loadSetPlan('kato-20-852'); // the M1 oval
        useSimulationStore.getState().clearTrains();
    });

    /** A train wrecked where it stands, and one running round the oval into it. */
    function pileUp(): { wreck: string; train: string } {
        const wreckId = spawnTrainAtClearestSpot()!;
        useSimulationStore.getState().setCrashed(wreckId);
        const trainId = spawnTrainAtClearestSpot()!;
        runSimulation(60 * 60);
        return { wreck: wreckId, train: trainId };
    }

    it('block the line: a train running round the oval crashes into one', () => {
        const { wreck: wreckId, train: trainId } = pileUp();
        const { trains } = useSimulationStore.getState();
        expect(trains[trainId].crashed).toBe(true);
        const log = useSimulationStore.getState().simLog.filter(e => e.type === 'collision');
        expect(log.map(e => [e.trainId, e.detail])).toEqual([[trainId, `crashed with ${wreckId}`]]);
        // Counted once: the wreck was made by hand, the pile-up by the train
        expect(summarize()).toMatchObject({ crashed: 2, wrecks: 1 });
        expect(useSimulationStore.getState().lastWreckAt).toBeGreaterThan(0);
    });

    it('stay until cleared: Play resumes, and leaves them be', () => {
        pileUp();
        useSimulationStore.getState().setRunning(false);
        startSimulation();
        expect(summarize().crashed).toBe(2);
        expect(useSimulationStore.getState().isRunning).toBe(true);
    });

    it('re-railed, stand clear of each other, their debris swept up', () => {
        const { train: trainId } = pileUp();
        const debrisOf = (id: string) => useSimulationStore.getState().crashedParts.filter(p => p.trainId === id);
        expect(debrisOf(trainId).length).toBeGreaterThan(0);

        expect(rerailWrecks()).toEqual([]);
        const { trains } = useSimulationStore.getState();
        expect(Object.values(trains).every(t => !t.crashed && t.stopped && t.speed === 0)).toBe(true);
        const { edges, nodes } = useTrackStore.getState();
        expect(detectCollisions(trains, edges, nodes)).toEqual([]);
        expect(debrisOf(trainId)).toEqual([]);
        // The record keeps the wreck: a re-railed train was still wrecked
        expect(summarize()).toMatchObject({ crashed: 0, wrecks: 1 });

        // Both run again when told to
        for (const id of Object.keys(trains)) useSimulationStore.getState().setTrainStopped(id, false);
        runSimulation(60);
        expect(Object.values(useSimulationStore.getState().trains).every(t => t.speed > 0)).toBe(true);
    });

    it('taken off the track, take their debris with them', () => {
        const { train: trainId } = pileUp();
        useSimulationStore.getState().removeTrain(trainId);
        expect(useSimulationStore.getState().crashedParts.filter(p => p.trainId === trainId)).toEqual([]);
        useSimulationStore.getState().clearTrains();
        expect(useSimulationStore.getState().crashedParts).toEqual([]);
    });

    it('only a wreck can be re-railed', () => {
        const id = spawnTrainAtClearestSpot()!;
        expect(useSimulationStore.getState().rerailTrain(id)).toBe(false);
        expect(useSimulationStore.getState().rerailTrain('no-such-train')).toBe(false);
    });
});
