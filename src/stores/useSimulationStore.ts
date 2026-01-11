/**
 * Simulation Store - Main Export
 * 
 * Manages game loop state: trains, debris, and time control.
 */

import { create } from 'zustand';
import type { SimulationStore } from './slices/simulation';
import {
    createTrainSlice,
    createDebrisSlice,
    createControlSlice,
} from './slices/simulation';
import { immer } from 'zustand/middleware/immer';

export const DEFAULT_CARRIAGE_SPACING = 30;

export const useSimulationStore = create<SimulationStore>()(
    immer((...args) => ({
        // Initial State
        trains: {},
        crashedParts: [],
        isRunning: false,
        speedMultiplier: 1.0,
        error: null,

        // Slices
        ...createTrainSlice(...args),
        ...createDebrisSlice(...args),
        ...createControlSlice(...args),
    }))
);

// Named Selectors
export const selectTrains = (state: SimulationStore) => state.trains;
export const selectIsRunning = (state: SimulationStore) => state.isRunning;
export const selectCrashedParts = (state: SimulationStore) => state.crashedParts;
export const selectSpeedMultiplier = (state: SimulationStore) => state.speedMultiplier;
export const selectError = (state: SimulationStore) => state.error;

