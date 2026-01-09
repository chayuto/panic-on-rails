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

export const DEFAULT_CARRIAGE_SPACING = 30;

export const useSimulationStore = create<SimulationStore>()((...args) => ({
    // Initial State
    trains: {},
    crashedParts: [],
    isRunning: false,
    speedMultiplier: 1.0,

    // Slices
    ...createTrainSlice(...args),
    ...createDebrisSlice(...args),
    ...createControlSlice(...args),
}));
