/**
 * Simulation Control Slice
 */

import type { SimulationSliceCreator, ControlSlice } from './types';

export const createControlSlice: SimulationSliceCreator<ControlSlice> = (set) => ({
    setRunning: (running) => set({ isRunning: running }),

    toggleRunning: () => set((state) => ({ isRunning: !state.isRunning })),

    setSpeedMultiplier: (multiplier) => set({ speedMultiplier: multiplier }),
});
