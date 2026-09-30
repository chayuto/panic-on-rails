/**
 * Joining track at a set of points: the points survive the merge whichever
 * node carried them, every edge at the merged-away node follows it, and
 * linked points keep working.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTrackStore } from '../useTrackStore';
import { resetWorld } from '../../simulation/harness';
import { branchSide, routeThroughPiece } from '../../utils/switchRouting';

const state = () => useTrackStore.getState();
const at = (x: number, y: number, except?: string) => Object.values(state().nodes)
    .find(n => n.id !== except && Math.hypot(n.position.x - x, n.position.y - y) < 0.01)!;
const points = () => Object.values(state().nodes).filter(n => n.type === 'switch');

/** Every edge's nodes exist and list it; every node's edges exist. */
function integrityProblems(): string[] {
    const { nodes, edges } = state();
    const problems: string[] = [];
    for (const e of Object.values(edges)) {
        for (const id of [e.startNodeId, e.endNodeId]) {
            if (!nodes[id]) problems.push(`edge ${e.id} ends at missing node ${id}`);
            else if (!nodes[id].connections.includes(e.id)) problems.push(`node ${id} doesn't list edge ${e.id}`);
        }
    }
    for (const n of Object.values(nodes)) {
        for (const id of n.connections) if (!edges[id]) problems.push(`node ${n.id} lists missing edge ${id}`);
    }
    return problems;
}

describe('joining track at points', () => {
    beforeEach(() => resetWorld());

    it('a turnout snapped by its entry onto a track end keeps its points', () => {
        state().addTrack('kato-20-000', { x: -248, y: 0 }, 0); // ends at (0,0)
        state().addTrack('kato-20-202', { x: 0, y: 0 }, 0);    // entry at (0,0)
        const entry = points()[0];
        const lead = at(0, 0, entry.id);

        // The editor keeps the existing track's node and removes the new piece's
        state().connectNodes(lead.id, entry.id);

        const joined = state().nodes[lead.id];
        expect(state().nodes[entry.id]).toBeUndefined();
        expect(joined).toMatchObject({ type: 'switch', switchState: 0, switchBranches: entry.switchBranches });
        expect(joined.connections).toHaveLength(3);
        expect(integrityProblems()).toEqual([]);
    });

    it('deleting a turnout that brought its points onto a track end leaves a plain end', () => {
        // Found by the model-based building test
        state().addTrack('kato-20-000', { x: -248, y: 0 }, 0);
        const turnout = state().addTrack('kato-20-202', { x: 0, y: 0 }, 0)!;
        const entry = points()[0];
        const lead = at(0, 0, entry.id);
        state().connectNodes(lead.id, entry.id);

        state().removeTrack(turnout);

        const end = state().nodes[lead.id];
        expect(end).toMatchObject({ type: 'endpoint', connections: [expect.any(String)] });
        expect(end.switchBranches).toBeUndefined();
        expect(points()).toHaveLength(0);
        expect(integrityProblems()).toEqual([]);
    });

    it('a track end joined onto a turnout\'s open entry keeps the points where they are', () => {
        state().addTrack('kato-20-202', { x: 0, y: 0 }, 0);
        state().addTrack('kato-20-000', { x: -248, y: 0 }, 0);
        const entry = points()[0];
        state().connectNodes(entry.id, at(0, 0, entry.id).id);
        expect(state().nodes[entry.id].connections).toHaveLength(3);
        expect(integrityProblems()).toEqual([]);
    });

    it('linked points stay linked through a join: one click throws all four of a double crossover', () => {
        state().addTrack('kato-20-210', { x: 0, y: 0 }, 0);    // A1 at (0,0)
        state().addTrack('kato-20-000', { x: -248, y: 0 }, 0);
        const a1 = at(0, 0);
        const lead = at(0, 0, a1.id);
        state().connectNodes(lead.id, a1.id);

        expect(points()).toHaveLength(4);
        state().toggleSwitch(lead.id);
        expect(points().map(n => n.switchState)).toEqual([1, 1, 1, 1]);
        expect(integrityProblems()).toEqual([]);
    });
});

describe('routes through a piece', () => {
    beforeEach(() => resetWorld());

    it('follows a crossover from one turnout\'s points to the other\'s', () => {
        state().addTrack('kato-20-230', { x: 0, y: 0 }, 0); // #4 single crossover
        const { edges, nodes } = state();
        const [first, second] = points();
        const across = routeThroughPiece(first.id, first.switchBranches![1], edges, nodes);
        // The two turnouts' branches, joined inside the piece
        expect(across.edges).toHaveLength(2);
        expect(across.end).toBe(second.id);
    });

    it('knows which side each branch goes', () => {
        const sideOf = (part: string) => {
            resetWorld();
            state().addTrack(part, { x: 0, y: 0 }, 0);
            return branchSide(points()[0], state().edges, state().nodes);
        };
        expect(sideOf('kato-20-202')).toBe(-1); // #6 left: branch to the north, screen-left
        expect(sideOf('kato-20-203')).toBe(1);
    });

    it('follows a double crossover\'s diagonal through all five steps to the far track', () => {
        state().addTrack('kato-20-210', { x: 0, y: 0 }, 0);
        const a1 = at(0, 0);
        const { edges, nodes } = state();
        const diagonal = routeThroughPiece(a1.id, a1.switchBranches![1], edges, nodes);
        expect(diagonal.edges).toHaveLength(5);
        expect(nodes[diagonal.end].position.x).toBeCloseTo(310, 1);
        expect(nodes[diagonal.end].position.y).toBeCloseTo(33, 1);
        // The straight route is one edge, to the other end of the same track
        expect(routeThroughPiece(a1.id, a1.switchBranches![0], edges, nodes).edges).toHaveLength(1);
    });

    it('judges the side from where each route leaves, though both start out straight ahead', () => {
        state().addTrack('kato-20-210', { x: 0, y: 0 }, 0);
        const { edges, nodes } = state();
        expect(branchSide(at(0, 0), edges, nodes)).toBe(1);   // A1's diagonal drops to track B
        expect(branchSide(at(0, 33), edges, nodes)).toBe(-1); // B1's rises to track A
    });
});
