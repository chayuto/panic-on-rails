/**
 * Piers: the Pier tool raises a joint onto Kato's next support, or lowers
 * it, and the track either side becomes a grade.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KATO_SUPPORTS, nextSupport, raiseJoint, supportName, supportsAt } from '../piers';
import { gradeOf, heightOf } from '../elevation';
import { useTrackStore } from '../../stores/useTrackStore';
import { useHistoryStore } from '../../stores/useHistoryStore';
import { resetWorld } from '../../simulation/harness';

const state = () => useTrackStore.getState();

describe('supports', () => {
    it('step up through Kato\'s heights, and back down, stopping at the top and bottom', () => {
        expect(nextSupport(KATO_SUPPORTS, 0, 1)).toEqual({ height: 5, name: 'Spacer' });
        expect(nextSupport(KATO_SUPPORTS, 10, 1)).toEqual({ height: 25, name: 'Pier No.1' });
        expect(nextSupport(KATO_SUPPORTS, 60, 1).height).toBe(60);
        expect(nextSupport(KATO_SUPPORTS, 25, -1).height).toBe(10);
        expect(nextSupport(KATO_SUPPORTS, 0, -1).height).toBe(0);
        // From a height that isn't a standard one, to the next that is
        expect(nextSupport(KATO_SUPPORTS, 30, 1).height).toBe(35);
        expect(nextSupport(KATO_SUPPORTS, 30, -1).height).toBe(25);
    });
});

describe('the Pier tool', () => {
    beforeEach(() => {
        resetWorld();
        useHistoryStore.getState().clear();
    });

    /** Two Kato straights joined end to end; returns the joint between them. */
    function joint(): string {
        const a = state().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const b = state().addTrack('kato-20-000', { x: 248, y: 0 }, 0)!;
        state().connectNodes(state().edges[a].endNodeId, state().edges[b].startNodeId);
        return state().edges[a].endNodeId;
    }

    it('raises a joint onto the next support, undoably, and the track either side becomes a grade', () => {
        const id = joint();
        expect(raiseJoint(id, 1)).toEqual({ height: 5, name: 'Spacer' });
        expect(raiseJoint(id, 1)?.name).toBe('Stairs');
        expect(heightOf(state().nodes[id])).toBe(10);
        const [first, second] = Object.values(state().edges);
        expect(Math.abs(gradeOf(first, state().nodes))).toBeCloseTo(10 / 248, 9);
        expect(Math.abs(gradeOf(second, state().nodes))).toBeCloseTo(10 / 248, 9);
        expect(supportName(KATO_SUPPORTS, state().nodes[id])).toBe('Stairs');

        // Shift-click lowers it; Undo puts it back
        expect(raiseJoint(id, -1)?.name).toBe('Spacer');
        useHistoryStore.getState().undo();
        expect(heightOf(state().nodes[id])).toBe(10);
    });

    it('does nothing at the bottom, or on track with no piers in the game', () => {
        const id = joint();
        expect(raiseJoint(id, -1)).toBeNull();
        expect(useHistoryStore.getState().past).toHaveLength(0);

        const marklin = state().addTrack('marklin-24188', { x: 0, y: 300 }, 0)!;
        const end = state().nodes[state().edges[marklin].endNodeId];
        expect(supportsAt(end, state().edges)).toBeNull();
        expect(raiseJoint(end.id, 1)).toBeNull();
    });
});
