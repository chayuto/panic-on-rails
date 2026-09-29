/**
 * Car placement: bogies on the rails, bodies on the chord, cars following
 * the route the train took.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getCarPoses } from '../trainCars';
import { BOGIE_SPACING, CAR_PITCH } from '../../config/rollingStock';
import { useTrackStore } from '../../stores/useTrackStore';
import { resetWorld } from '../../simulation/harness';
import type { Train } from '../../types';

const train = (over: Partial<Train>): Train => ({
    id: 't1',
    currentEdgeId: '',
    distanceAlongEdge: 0,
    direction: 1,
    speed: 100,
    color: '#E74C3C',
    carriageCount: 3,
    ...over,
});

describe('getCarPoses', () => {
    beforeEach(() => resetWorld());

    it('lines cars up behind the front bogie on a straight, a pitch apart', () => {
        const edgeId = useTrackStore.getState().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const { edges, nodes } = useTrackStore.getState();
        const poses = getCarPoses(train({ currentEdgeId: edgeId, distanceAlongEdge: 240 }), edges, nodes);
        expect(poses).toHaveLength(3);
        for (const [i, pose] of poses.entries()) {
            // Body centre halfway between the car's two bogies
            expect(pose.x).toBeCloseTo(240 - i * CAR_PITCH - BOGIE_SPACING / 2, 6);
            expect(pose.y).toBeCloseTo(0, 6);
            expect(pose.rotation).toBeCloseTo(0, 6);
        }
    });

    it('faces the other way when the train runs backward along the edge', () => {
        const edgeId = useTrackStore.getState().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const { edges, nodes } = useTrackStore.getState();
        const [loco] = getCarPoses(train({ currentEdgeId: edgeId, distanceAlongEdge: 10, direction: -1, carriageCount: 1 }), edges, nodes);
        expect(loco.x).toBeCloseTo(10 + BOGIE_SPACING / 2, 6);
        expect(Math.abs(loco.rotation)).toBeCloseTo(180, 6);
    });

    it('cuts across a curve: the body sits inside the arc, like a real car', () => {
        const edgeId = useTrackStore.getState().addTrack('kato-20-170', { x: 0, y: 0 }, 0)!; // R216-45
        const { edges, nodes } = useTrackStore.getState();
        const edge = edges[edgeId];
        const [loco] = getCarPoses(train({ currentEdgeId: edgeId, distanceAlongEdge: edge.length, carriageCount: 1 }), edges, nodes);
        const g = edge.geometry;
        if (g.type !== 'arc') throw new Error('expected an arc');
        const fromCentre = Math.hypot(loco.x - g.center.x, loco.y - g.center.y);
        // Chord midpoint of a BOGIE_SPACING chord on R216: sagitta ≈ s²/(8R)
        expect(fromCentre).toBeCloseTo(216 - (BOGIE_SPACING ** 2) / (8 * 216), 1);
    });

    describe('through a turnout', () => {
        /** A straight leading west out of a #6 left turnout's entry. */
        function build() {
            const store = useTrackStore.getState();
            store.addTrack('kato-20-202', { x: 0, y: 0 }, 0);            // entry at (0,0), branch heads north-east
            const lead = store.addTrack('kato-20-000', { x: -248, y: 0 }, 0)!; // (-248,0) → (0,0)
            const { nodes } = useTrackStore.getState();
            const entry = Object.values(nodes).find(n => n.type === 'switch')!;
            const leadEnd = Object.values(nodes).find(n => n.id !== entry.id && n.position.x === 0 && n.position.y === 0)!;
            store.connectNodes(entry.id, leadEnd.id, lead);
            const state = useTrackStore.getState();
            return { lead, switchNode: state.nodes[entry.id], ...state };
        }

        it('follows the route the train actually took, not the way the turnout is set', () => {
            const { lead, switchNode, edges, nodes } = build();
            const [, branch] = switchNode.switchBranches!;
            expect(switchNode.switchState).toBe(0); // set for the main route
            // Heading west on the lead, 8mm past the turnout, having come off the branch
            const t = train({ currentEdgeId: lead, distanceAlongEdge: 240, direction: -1, trail: [branch] });
            const withTrail = getCarPoses(t, edges, nodes);
            const guessed = getCarPoses({ ...t, trail: [] }, edges, nodes);
            // The second car is still on the turnout: on the branch it's north of the main line
            expect(withTrail[1].y).toBeLessThan(-1);
            expect(guessed[1].y).toBeCloseTo(0, 6);
        });
    });
});
