/**
 * Car placement: bogies on the rails, bodies on the chord, cars following
 * the route the train took.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getCarPoses, reverseConsist } from '../trainCars';
import { stepSimulation, type SimWorld } from '../../simulation/step';
import { BOGIE_INSET_RATIO, BOGIE_SPACING, CAR_PITCH, ROLLING_STOCK } from '../../config/rollingStock';
import { useTrackStore } from '../../stores/useTrackStore';
import { resetWorld } from '../../simulation/harness';
import type { Train } from '../../types';
import { sizeOf } from '../../config/scales';

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

    it('spaces an H0 train\'s cars in proportion to its scale', () => {
        const k = sizeOf('ho-scale');
        const edgeId = useTrackStore.getState().addTrack('marklin-24360', { x: 0, y: 0 }, 0)!;
        const { edges, nodes } = useTrackStore.getState();
        const poses = getCarPoses(train({ currentEdgeId: edgeId, distanceAlongEdge: 350, scale: 'ho-scale' }), edges, nodes);
        expect(poses[0].x - poses[1].x).toBeCloseTo(CAR_PITCH * k, 6);
        expect(poses[0].x).toBeCloseTo(350 - (BOGIE_SPACING * k) / 2, 6);
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

    describe('a model\'s own cars', () => {
        /** Two 248 mm straights end to end, west to east, for a long train. */
        function line() {
            const store = useTrackStore.getState();
            const first = store.addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
            const second = store.addTrack('kato-20-000', { x: 248, y: 0 }, 0)!;
            const [a, b] = Object.values(useTrackStore.getState().nodes).filter(n => n.position.x === 248);
            store.connectNodes(a.id, b.id);
            return { first, second, ...useTrackStore.getState() };
        }

        it('rides each car at its own length, coupled up end to end', () => {
            const { first, second, edges, nodes } = line();
            // An ES44AC and two freight cars, over couplers
            const lengths = [139, 90, 95];
            const poses = getCarPoses(train({ currentEdgeId: second, distanceAlongEdge: 200, carLengths: lengths, trail: [first] }), edges, nodes);
            const gap = ROLLING_STOCK.GAP;
            const bodies = lengths.map(l => l - gap);
            expect(poses.map(p => p.length)).toEqual(bodies);
            // Each body's front end, from its centre: the next car's front is a gap behind the one ahead's back
            const fronts = poses.map(p => p.x + p.length / 2);
            const backs = poses.map(p => p.x - p.length / 2);
            expect(fronts[1]).toBeCloseTo(backs[0] - gap, 6);
            expect(fronts[2]).toBeCloseTo(backs[1] - gap, 6);
            // The train's position is the locomotive's front bogie, set in from its front end
            expect(fronts[0]).toBeCloseTo(248 + 200 + bodies[0] * BOGIE_INSET_RATIO, 6);
        });

        it('turns back without moving a car, however long each is', () => {
            const { first, second, edges, nodes } = line();
            const t = train({ currentEdgeId: second, distanceAlongEdge: 150, carLengths: [139, 90, 95, 95], trail: [first] });
            const before = getCarPoses(t, edges, nodes);
            const reversed = reverseConsist(t, edges, nodes);
            const after = getCarPoses(reversed, edges, nodes);
            const centres = (poses: { x: number; y: number }[]) => poses.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).sort();
            expect(centres(after)).toEqual(centres(before));
            // The locomotive, now at the back, is still the long one
            expect(after[after.length - 1].length).toBe(139 - ROLLING_STOCK.GAP);
            const again = reverseConsist(reversed, edges, nodes);
            expect(again.distanceAlongEdge).toBeCloseTo(150, 6);
        });

        it('are the short uniform car when a train has no lengths', () => {
            const { second, edges, nodes } = line();
            const uniform = getCarPoses(train({ currentEdgeId: second, distanceAlongEdge: 150 }), edges, nodes);
            const asLengths = getCarPoses(train({ currentEdgeId: second, distanceAlongEdge: 150, carLengths: [CAR_PITCH, CAR_PITCH, CAR_PITCH] }), edges, nodes);
            expect(asLengths).toEqual(uniform);
        });
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
            store.connectNodes(entry.id, leadEnd.id);
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

        it('bunches cars up at points with nothing joined behind them, never folding onto the other route', () => {
            const store = useTrackStore.getState();
            store.addTrack('kato-20-202', { x: 0, y: 0 }, 0);
            const { edges, nodes } = useTrackStore.getState();
            const entry = Object.values(nodes).find(n => n.type === 'switch')!;
            const [main] = entry.switchBranches!;
            // Just off the points on the main route, the rest of the train behind them
            const poses = getCarPoses(train({ currentEdgeId: main, distanceAlongEdge: 20 }), edges, nodes);
            for (const pose of poses) expect(pose.y).toBeCloseTo(0, 6);
        });
    });

    describe('turning back', () => {
        const centres = (poses: { x: number; y: number }[]) => poses.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).sort();

        it('reverses without moving a car: the far end leads and the locomotive pushes', () => {
            useTrackStore.getState().addTrack('kato-20-000', { x: 0, y: 0 }, 0);
            const second = useTrackStore.getState().addTrack('kato-20-000', { x: 248, y: 0 }, 0)!;
            const { nodes } = useTrackStore.getState();
            const [a, b] = Object.values(nodes).filter(n => n.position.x === 248);
            useTrackStore.getState().connectNodes(a.id, b.id);
            const { edges } = useTrackStore.getState();
            const firstEdge = Object.values(edges).find(e => e.id !== second)!.id;

            const t = train({ currentEdgeId: second, distanceAlongEdge: 60, carriageCount: 4, trail: [firstEdge] });
            const before = getCarPoses(t, edges, useTrackStore.getState().nodes);
            const reversed = reverseConsist(t, edges, useTrackStore.getState().nodes);
            const after = getCarPoses(reversed, edges, useTrackStore.getState().nodes);

            expect(reversed.direction).toBe(-1);
            expect(reversed.locoLeading).toBe(false);
            expect(centres(after)).toEqual(centres(before));
            // The new leading car is the old last car
            expect(after[0].x).toBeCloseTo(before[3].x, 6);

            // And back again: the locomotive leads from where it started
            const again = reverseConsist(reversed, edges, useTrackStore.getState().nodes);
            expect(again.locoLeading).toBe(true);
            expect(again.currentEdgeId).toBe(second);
            expect(again.distanceAlongEdge).toBeCloseTo(60, 6);
        });

        it('turning back at a buffer stop leaves the train where it is', () => {
            const store = useTrackStore.getState();
            store.addTrack('kato-20-000', { x: 0, y: 0 }, 0);
            store.addTrack('kato-20-000', { x: 248, y: 0 }, 0);
            const { nodes: n0, edges: e0 } = useTrackStore.getState();
            const [a, b] = Object.values(n0).filter(n => n.position.x === 248);
            const secondId = Object.values(e0).find(e => e.geometry.type === 'straight' && e.geometry.start.x === 248)!.id;
            store.connectNodes(a.id, b.id);
            const { edges, nodes } = useTrackStore.getState();
            let w: SimWorld = {
                trains: { t1: train({ currentEdgeId: secondId, distanceAlongEdge: 150, carriageCount: 3 }) },
                edges, nodes, sensors: {}, signals: {}, wires: {}, stations: {}, crashedParts: [], nearPairs: [],
            };
            let previous = getCarPoses(w.trains.t1, edges, nodes);
            let bounced = false;
            for (let i = 0; i < 6 * 60 && !bounced; i++) {
                const r = stepSimulation(w, 1 / 60, { now: 0, random: () => 0.5 });
                w = r.world;
                const poses = getCarPoses(w.trains.t1, edges, nodes);
                bounced = r.events.some(e => e.type === 'bounce');
                // No car ever jumps: from one frame to the next each stays within a crawl
                expect(Math.max(...centres(poses).map((c, k) => {
                    const [x, y] = c.split(',').map(Number);
                    const [px, py] = centres(previous)[k].split(',').map(Number);
                    return Math.hypot(x - px, y - py);
                }))).toBeLessThan(3);
                previous = poses;
            }
            expect(bounced).toBe(true);
            expect(w.trains.t1.locoLeading).toBe(false);
        });
    });
});
