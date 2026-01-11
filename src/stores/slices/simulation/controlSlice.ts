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
    setRunning: (running) => set((state) => {
        state.isRunning = running;
    }),

    /**
     * Toggle between running and paused states.
     */
    toggleRunning: () => set((state) => {
        state.isRunning = !state.isRunning;
    }),

    /**
     * Set the simulation speed multiplier.
     * 
     * @param multiplier - Speed factor (1.0 = normal speed)
     */
    setSpeedMultiplier: (multiplier) => set((state) => {
        state.speedMultiplier = multiplier;
    }),

    /**
     * Set a simulation error message.
     * Pauses the simulation when an error occurs.
     * 
     * @param error - Error message or null to clear
     */
    setError: (error) => set((state) => {
        state.error = error;
        if (error) {
            state.isRunning = false;
        }
    }),

    /**
     * Clear the current error message.
     */
    clearError: () => set((state) => {
        state.error = null;
    }),
});
