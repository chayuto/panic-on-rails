/**
 * Simulation Store Types
 */

import type { StateCreator } from 'zustand';
import 'zustand/middleware/immer';
import type { TrainId, EdgeId, Train } from '../../../types';
import type { CrashedPart } from '../../../utils/crashPhysics';
import type { SimEvent, SimEventType } from './eventLogSlice';
import type { OperatingSession, SessionResult } from '../../../simulation/session';

export interface SimulationStateData {
    trains: Record<TrainId, Train>;
    crashedParts: CrashedPart[];
    /** Pairs of trains close enough for a near miss (see SimWorld.nearPairs) */
    nearPairs: string[];
    isRunning: boolean;
    speedMultiplier: number;
    error: string | null;
    /** Something the player should know that isn't an error: why a train wasn't added */
    notice: string | null;
    simLog: SimEvent[];
    simLogSeq: number;
    simElapsed: number;
    /** Trains wrecked since the log was cleared: the session, in the browser */
    wrecks: number;
    /** When the last one was wrecked (simElapsed); null if none has been */
    lastWreckAt: number | null;
    /** The operating session running, if any */
    session: OperatingSession | null;
    /** How the last session went, until the player dismisses it */
    sessionResult: SessionResult | null;
}

export interface TrainSlice {
    spawnTrain: (edgeId: EdgeId, color?: string, carriageCount?: number, distance?: number, stockId?: string) => TrainId;
    setTrainStopped: (trainId: TrainId, stopped: boolean) => void;
    setTrainThrottle: (trainId: TrainId, throttle: number) => void;
    reverseTrain: (trainId: TrainId) => void;
    removeTrain: (trainId: TrainId) => void;
    rerailTrain: (trainId: TrainId) => boolean;
    updateTrainPosition: (trainId: TrainId, distance: number, edgeId?: EdgeId, direction?: 1 | -1, bounceTime?: number) => void;
    setCrashed: (trainId: TrainId) => void;
    clearTrains: () => void;
}

export interface DebrisSlice {
    addCrashedParts: (parts: CrashedPart[]) => void;
    setCrashedParts: (parts: CrashedPart[]) => void;
    clearDebris: () => void;
}

export interface ControlSlice {
    setRunning: (running: boolean) => void;
    toggleRunning: () => void;
    setSpeedMultiplier: (multiplier: number) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    setNotice: (notice: string | null) => void;
}

export interface EventLogSliceActions {
    logEvent: (type: SimEventType, trainId: TrainId, edgeId: EdgeId, detail: string) => void;
    tickElapsed: (dt: number) => void;
    recordWrecks: (count: number) => void;
    setSession: (session: OperatingSession | null) => void;
    setSessionResult: (result: SessionResult | null) => void;
    clearLog: () => void;
}

// Combined Store Type
export type SimulationStore = SimulationStateData & TrainSlice & DebrisSlice & ControlSlice & EventLogSliceActions;

// Slice Creator Type
export type SimulationSliceCreator<T> = StateCreator<
    SimulationStore,
    [['zustand/immer', never]],
    [],
    T
>;
