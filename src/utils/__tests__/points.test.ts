import { describe, it, expect, beforeEach } from 'vitest';
import { pointsOccupied, throwPoints } from '../points';
import { resetWorld, loadSetPlan } from '../../simulation/harness';
import { useTrackStore } from '../../stores/useTrackStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import type { TrackNode } from '../../types';

/** M2's first set of points: the node, one of its routes, and what lies beyond that route. */
function m2Points() {
    resetWorld();
    loadSetPlan('kato-20-853');
    useSimulationStore.getState().clearTrains();
    const { nodes, edges } = useTrackStore.getState();
    const points = Object.values(nodes).find(n => n.type === 'switch')!;
    const route = edges[points.switchBranches![0]];
    const farId = route.startNodeId === points.id ? route.endNodeId : route.startNodeId;
    const beyond = edges[nodes[farId].connections.find(id => id !== route.id)!];
    // The track leading up to the points: joined at them, not one of their routes
    const approach = edges[points.connections.find(id => !points.switchBranches!.includes(id))!];
    return { points, route, farId, beyond, approach };
}

const occupied = (points: TrackNode) => {
    const { edges, nodes } = useTrackStore.getState();
    return pointsOccupied(points.id, useSimulationStore.getState().trains, edges, nodes);
};

describe('the points lock', () => {
    beforeEach(() => resetWorld());

    it('holds while a train is on one of the routes', () => {
        const { points, route } = m2Points();
        useSimulationStore.getState().spawnTrain(route.id, undefined, 1, route.length / 2);
        expect(occupied(points)).toBe(true);
    });

    it('holds until the last car is off, not only the front', () => {
        const { points, beyond, farId } = m2Points();
        // Its front just past the points' route, heading away: its coaches still on the points
        const heading = beyond.startNodeId === farId ? 1 : -1;
        const id = useSimulationStore.getState().spawnTrain(beyond.id, undefined, 3, heading === 1 ? 20 : beyond.length - 20);
        useSimulationStore.setState(s => ({ trains: { ...s.trains, [id]: { ...s.trains[id], direction: heading } } }));
        expect(occupied(points)).toBe(true);
    });

    it('is off for a train on the track leading up to them: points can still be thrown in front of one', () => {
        const { points, approach } = m2Points();
        useSimulationStore.getState().spawnTrain(approach.id, undefined, 1, approach.length / 2);
        expect(occupied(points)).toBe(false);
    });

    it('refuses a throw while a train is on them, and allows it once clear', () => {
        const { points, route } = m2Points();
        const state = () => useTrackStore.getState().nodes[points.id].switchState;
        const before = state();
        const id = useSimulationStore.getState().spawnTrain(route.id, undefined, 1, route.length / 2);
        expect(throwPoints(points.id)).toBe(false);
        expect(state()).toBe(before);
        useSimulationStore.getState().removeTrain(id);
        expect(throwPoints(points.id)).toBe(true);
        expect(state()).not.toBe(before);
    });
});
