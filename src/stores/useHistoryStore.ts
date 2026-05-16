/**
 * History Store — Undo/Redo for layout edits.
 *
 * Captures combined snapshots of the three persisted layout stores (track
 * graph, logic elements, budget) and lets the user step backward and forward
 * through edit-mode gestures.
 *
 * Design:
 * - `record()` is called by each undoable gesture *before* it mutates state.
 *   It pushes the current combined state onto the `past` stack and clears the
 *   `future` (redo) stack — exactly one `record()` call per user gesture.
 * - `undo()` / `redo()` swap the live state with a stacked snapshot.
 * - The history stacks are NOT persisted — undo history is per-session.
 *
 * Snapshots are deep-cloned with `structuredClone` so later store mutations
 * (which build new objects but may share nested references) can never reach
 * back and corrupt a retained snapshot.
 *
 * Budget is included because placing track spends it and deleting track does
 * not refund it — without the budget in the snapshot, undo would desync the
 * balance. Logic elements are included because `removeTrack` cascade-deletes
 * orphaned sensors/signals, which an undo must restore.
 */

import { create } from 'zustand';
import { useTrackStore } from './useTrackStore';
import { useLogicStore } from './useLogicStore';
import { useBudgetStore } from './useBudgetStore';
import { rebuildSpatialIndices } from './slices';
import type {
    NodeId, EdgeId, TrackNode, TrackEdge,
    SensorId, SignalId, WireId, Sensor, Signal, Wire,
} from '../types';

/** Max number of undo steps retained. Older entries are discarded. */
const HISTORY_LIMIT = 50;

/** A full, deep-cloned snapshot of every store that holds layout state. */
export interface LayoutSnapshot {
    nodes: Record<NodeId, TrackNode>;
    edges: Record<EdgeId, TrackEdge>;
    sensors: Record<SensorId, Sensor>;
    signals: Record<SignalId, Signal>;
    wires: Record<WireId, Wire>;
    budgetBalance: number;
    budgetTotalSpent: number;
    budgetStartingBudget: number;
}

/** Read the current state of all layout stores into one deep-cloned snapshot. */
function captureSnapshot(): LayoutSnapshot {
    const track = useTrackStore.getState();
    const logic = useLogicStore.getState();
    const budget = useBudgetStore.getState();
    return structuredClone({
        nodes: track.nodes,
        edges: track.edges,
        sensors: logic.sensors,
        signals: logic.signals,
        wires: logic.wires,
        budgetBalance: budget.balance,
        budgetTotalSpent: budget.totalSpent,
        budgetStartingBudget: budget.startingBudget,
    });
}

/** Restore a snapshot into every layout store and rebuild spatial indices. */
function applySnapshot(snap: LayoutSnapshot): void {
    // Clone again on apply so the live store and the retained snapshot never
    // share references — a later edit must not mutate history.
    const s = structuredClone(snap);
    rebuildSpatialIndices(s.nodes, s.edges);
    useTrackStore.setState({ nodes: s.nodes, edges: s.edges });
    useLogicStore.setState({ sensors: s.sensors, signals: s.signals, wires: s.wires });
    useBudgetStore.setState({
        balance: s.budgetBalance,
        totalSpent: s.budgetTotalSpent,
        startingBudget: s.budgetStartingBudget,
    });
}

interface HistoryState {
    /** Snapshots of past states, oldest first. The last entry is one undo away. */
    past: LayoutSnapshot[];
    /** Snapshots of undone states. The last entry is one redo away. */
    future: LayoutSnapshot[];
}

interface HistoryActions {
    /** Call BEFORE an undoable mutation: stacks the current state, drops redo. */
    record: () => void;
    /** Step back one edit. No-op when there is nothing to undo. */
    undo: () => void;
    /** Re-apply the last undone edit. No-op when there is nothing to redo. */
    redo: () => void;
    /** Drop all history — used when a new/loaded layout replaces everything. */
    clear: () => void;
}

export const useHistoryStore = create<HistoryState & HistoryActions>((set, get) => ({
    past: [],
    future: [],

    record: () => {
        set((state) => ({
            past: [...state.past, captureSnapshot()].slice(-HISTORY_LIMIT),
            future: [],
        }));
    },

    undo: () => {
        const { past } = get();
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const current = captureSnapshot();
        applySnapshot(previous);
        set((state) => ({
            past: state.past.slice(0, -1),
            future: [...state.future, current].slice(-HISTORY_LIMIT),
        }));
    },

    redo: () => {
        const { future } = get();
        if (future.length === 0) return;
        const next = future[future.length - 1];
        const current = captureSnapshot();
        applySnapshot(next);
        set((state) => ({
            past: [...state.past, current].slice(-HISTORY_LIMIT),
            future: state.future.slice(0, -1),
        }));
    },

    clear: () => set({ past: [], future: [] }),
}));

// Named selectors — components subscribe to these for reactive enable/disable.
export const selectCanUndo = (s: HistoryState) => s.past.length > 0;
export const selectCanRedo = (s: HistoryState) => s.future.length > 0;
