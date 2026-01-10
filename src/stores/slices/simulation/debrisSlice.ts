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
    addCrashedParts: (parts) => set((state) => ({
        crashedParts: [...state.crashedParts, ...parts],
    })),

    /**
     * Set the entire list of crashed parts.
     * Used for updating physics state.
     * 
     * @param parts - New array of crashed parts
     */
    setCrashedParts: (parts) => set({ crashedParts: parts }),

    /**
     * Remove all debris from the simulation.
     */
    clearDebris: () => set({ crashedParts: [] }),
});
