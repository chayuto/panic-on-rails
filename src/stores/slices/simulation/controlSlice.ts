/**
 * Simulation Control Slice
 */

import type { SimulationSliceCreator, ControlSlice } from './types';

export const createControlSlice: SimulationSliceCreator<ControlSlice> = (set) => ({
    /**
     * Set the simulation running state.
     * 
     * @param running - true to run, false to pause
     */
    setRunning: (running) => set({ isRunning: running }),

    /**
     * Toggle between running and paused states.
     */
    toggleRunning: () => set((state) => ({ isRunning: !state.isRunning })),

    /**
     * Set the simulation speed multiplier.
     * 
     * @param multiplier - Speed factor (1.0 = normal speed)
     */
    setSpeedMultiplier: (multiplier) => set({ speedMultiplier: multiplier }),
});
