/**
 * Debris Management Slice
 */

import type { SimulationSliceCreator, DebrisSlice } from './types';

export const createDebrisSlice: SimulationSliceCreator<DebrisSlice> = (set) => ({
    addCrashedParts: (parts) => set((state) => ({
        crashedParts: [...state.crashedParts, ...parts],
    })),

    setCrashedParts: (parts) => set({ crashedParts: parts }),

    clearDebris: () => set({ crashedParts: [] }),
});
