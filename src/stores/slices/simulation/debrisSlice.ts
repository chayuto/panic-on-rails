/**
 * Debris Management Slice
 */

import type { SimulationSliceCreator, DebrisSlice } from './types';

export const createDebrisSlice: SimulationSliceCreator<DebrisSlice> = (set) => ({
    /**
     * Add new crashed parts (debris) to the simulation.
     * 
     * @param parts - Array of parts to add
     */
    addCrashedParts: (parts) => set((state) => {
        state.crashedParts.push(...parts);
    }),

    /**
     * Set the entire list of crashed parts.
     * Used for updating physics state.
     * 
     * @param parts - New array of crashed parts
     */
    setCrashedParts: (parts) => set((state) => {
        state.crashedParts = parts;
    }),

    /**
     * Remove all debris from the simulation.
     */
    clearDebris: () => set((state) => {
        state.crashedParts = [];
    }),
});
