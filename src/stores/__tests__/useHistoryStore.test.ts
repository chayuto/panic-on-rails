/**
 * Tests for useHistoryStore — undo/redo over the layout stores.
 *
 * These exercise the real track/logic/budget stores so the snapshot
 * capture/restore round-trip is verified end-to-end, not against mocks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '../useHistoryStore';
import { useTrackStore } from '../useTrackStore';
import { useLogicStore } from '../useLogicStore';
import { useBudgetStore } from '../useBudgetStore';

const STRAIGHT = 'kato-20-000'; // 248mm n-scale straight

function edgeCount(): number {
    return Object.keys(useTrackStore.getState().edges).length;
}

describe('useHistoryStore', () => {
    beforeEach(() => {
        useTrackStore.getState().clearLayout();
        useLogicStore.getState().clearLogic();
        useBudgetStore.getState().reset();
        useHistoryStore.getState().clear();
    });

    it('starts with empty undo and redo stacks', () => {
        const s = useHistoryStore.getState();
        expect(s.past).toEqual([]);
        expect(s.future).toEqual([]);
    });

    it('undoes a track placement and redoes it', () => {
        useHistoryStore.getState().record();
        useTrackStore.getState().addTrack(STRAIGHT, { x: 100, y: 100 }, 0);
        expect(edgeCount()).toBe(1);

        useHistoryStore.getState().undo();
        expect(edgeCount()).toBe(0);

        useHistoryStore.getState().redo();
        expect(edgeCount()).toBe(1);
    });

    it('treats undo with an empty past stack as a no-op', () => {
        useTrackStore.getState().addTrack(STRAIGHT, { x: 0, y: 0 }, 0);
        useHistoryStore.getState().undo(); // nothing recorded
        expect(edgeCount()).toBe(1);
    });

    it('treats redo with an empty future stack as a no-op', () => {
        useHistoryStore.getState().record();
        useTrackStore.getState().addTrack(STRAIGHT, { x: 0, y: 0 }, 0);
        useHistoryStore.getState().redo(); // nothing undone
        expect(edgeCount()).toBe(1);
    });

    it('steps back through multiple edits in reverse order', () => {
        useHistoryStore.getState().record();
        useTrackStore.getState().addTrack(STRAIGHT, { x: 0, y: 0 }, 0);
        useHistoryStore.getState().record();
        useTrackStore.getState().addTrack(STRAIGHT, { x: 300, y: 0 }, 0);
        useHistoryStore.getState().record();
        useTrackStore.getState().addTrack(STRAIGHT, { x: 600, y: 0 }, 0);
        expect(edgeCount()).toBe(3);

        useHistoryStore.getState().undo();
        expect(edgeCount()).toBe(2);
        useHistoryStore.getState().undo();
        expect(edgeCount()).toBe(1);
        useHistoryStore.getState().undo();
        expect(edgeCount()).toBe(0);
    });

    it('drops the redo stack when a new edit is recorded after undo', () => {
        useHistoryStore.getState().record();
        useTrackStore.getState().addTrack(STRAIGHT, { x: 0, y: 0 }, 0);

        useHistoryStore.getState().undo();
        expect(useHistoryStore.getState().future).toHaveLength(1);

        // A fresh edit must invalidate the redo branch.
        useHistoryStore.getState().record();
        expect(useHistoryStore.getState().future).toHaveLength(0);
    });

    it('restores budget balance on undo', () => {
        const startBalance = useBudgetStore.getState().balance;

        useHistoryStore.getState().record();
        useBudgetStore.getState().spend(500);
        useTrackStore.getState().addTrack(STRAIGHT, { x: 0, y: 0 }, 0);
        expect(useBudgetStore.getState().balance).toBe(startBalance - 500);

        useHistoryStore.getState().undo();
        expect(useBudgetStore.getState().balance).toBe(startBalance);
        expect(edgeCount()).toBe(0);

        useHistoryStore.getState().redo();
        expect(useBudgetStore.getState().balance).toBe(startBalance - 500);
    });

    it('restores logic elements (sensors) on undo', () => {
        const edgeId = useTrackStore.getState().addTrack(STRAIGHT, { x: 0, y: 0 }, 0)!;

        useHistoryStore.getState().record();
        useLogicStore.getState().addSensor(edgeId, 50);
        expect(Object.keys(useLogicStore.getState().sensors)).toHaveLength(1);

        useHistoryStore.getState().undo();
        expect(Object.keys(useLogicStore.getState().sensors)).toHaveLength(0);

        useHistoryStore.getState().redo();
        expect(Object.keys(useLogicStore.getState().sensors)).toHaveLength(1);
    });

    it('caps the undo stack at the history limit', () => {
        for (let i = 0; i < 60; i++) {
            useHistoryStore.getState().record();
            useTrackStore.getState().addTrack(STRAIGHT, { x: i * 300, y: 0 }, 0);
        }
        expect(useHistoryStore.getState().past.length).toBeLessThanOrEqual(50);
    });

    it('clear() empties both stacks', () => {
        useHistoryStore.getState().record();
        useTrackStore.getState().addTrack(STRAIGHT, { x: 0, y: 0 }, 0);
        useHistoryStore.getState().undo();

        useHistoryStore.getState().clear();
        expect(useHistoryStore.getState().past).toEqual([]);
        expect(useHistoryStore.getState().future).toEqual([]);
    });

    it('keeps snapshots isolated from later store mutations', () => {
        useHistoryStore.getState().record();
        useTrackStore.getState().addTrack(STRAIGHT, { x: 0, y: 0 }, 0);
        useHistoryStore.getState().undo(); // back to empty; empty snapshot now in future

        // Mutate the live store after the undo.
        useTrackStore.getState().addTrack(STRAIGHT, { x: 900, y: 0 }, 0);

        // Redo must still restore exactly the recorded post-placement state
        // (1 edge), not be polluted by the intervening mutation.
        useHistoryStore.getState().redo();
        expect(edgeCount()).toBe(1);
    });
});
