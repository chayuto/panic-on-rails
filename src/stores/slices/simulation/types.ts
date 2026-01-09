/**
 * Simulation Store Types
 */

import type { StateCreator } from 'zustand';
import type { TrainId, EdgeId, Train } from '../../../types';
import type { CrashedPart } from '../../../utils/crashPhysics';

export interface SimulationStateData {
    trains: Record<TrainId, Train>;
    crashedParts: CrashedPart[];
    isRunning: boolean;
    speedMultiplier: number;
}

export interface TrainSlice {
    spawnTrain: (edgeId: EdgeId, color?: string, carriageCount?: number) => TrainId;
    removeTrain: (trainId: TrainId) => void;
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
}

// Combined Store Type
export type SimulationStore = SimulationStateData & TrainSlice & DebrisSlice & ControlSlice;

// Slice Creator Type
export type SimulationSliceCreator<T> = StateCreator<SimulationStore, [], [], T>;
