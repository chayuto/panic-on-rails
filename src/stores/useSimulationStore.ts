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
    createEventLogSlice,
} from './slices/simulation';
import { immer } from 'zustand/middleware/immer';

export const useSimulationStore = create<SimulationStore>()(
    immer((...args) => ({
        // Initial State
        trains: {},
        crashedParts: [],
        nearPairs: [],
        isRunning: false,
        speedMultiplier: 1.0,
        error: null,

        // Slices
        ...createTrainSlice(...args),
        ...createDebrisSlice(...args),
        ...createControlSlice(...args),
        ...createEventLogSlice(...args),
    }))
);

// Named Selectors
export const selectError = (state: SimulationStore) => state.error;

