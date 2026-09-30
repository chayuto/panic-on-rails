/**
 * Shared types for E2E test helpers.
 *
 * Store snapshots are what the debug bridge's `getState()` returns, typed
 * from the stores themselves (see `src/utils/debugBridge.ts`), so they
 * can't drift from the app.
 */

import type { PanicStoreBridge } from '../../src/utils/debugBridge';

export interface Vector2 {
    x: number;
    y: number;
}

type StateOf<K extends keyof PanicStoreBridge> = ReturnType<PanicStoreBridge[K]['getState']>;

export type TrackStateSnapshot = StateOf<'track'>;
export type TrackNodeSnapshot = TrackStateSnapshot['nodes'][string];
export type TrackEdgeSnapshot = TrackStateSnapshot['edges'][string];
export type ModeStateSnapshot = StateOf<'mode'>;
export type SimulationStateSnapshot = StateOf<'simulation'>;
export type TrainSnapshot = SimulationStateSnapshot['trains'][string];
export type EditorStateSnapshot = StateOf<'editor'>;

export interface AllStoresSnapshot {
    track: TrackStateSnapshot;
    mode: ModeStateSnapshot;
    simulation: SimulationStateSnapshot;
    editor: EditorStateSnapshot;
    logic: StateOf<'logic'>;
    collection: StateOf<'collection'>;
}

export interface ConsistencyReport {
    trackEdgeCount: { store: number; rendered: number; match: boolean };
    modeUiMatch: boolean;
    issues: string[];
}

export interface VerificationReport {
    screenshotPath: string;
    statePath: string;
    state: AllStoresSnapshot;
    consistency: ConsistencyReport;
}
