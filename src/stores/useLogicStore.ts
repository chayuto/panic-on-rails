/**
 * Logic Store for PanicOnRails
 * 
 * Manages sensors, signals, and wires for the automation system.
 * Uses slice pattern for modularity.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { LogicStore } from './slices/logic';
import {
    createSensorSlice,
    createSignalSlice,
    createWireSlice,
} from './slices/logic';

const initialState = {
    sensors: {},
    signals: {},
    wires: {},
};

export const useLogicStore = create<LogicStore>()(
    persist(
        immer((...args) => ({
            ...initialState,
            ...createSensorSlice(...args),
            ...createSignalSlice(...args),
            ...createWireSlice(...args),
        })),
        {
            name: 'panic-on-rails-logic-v1',
        }
    )
);

// Named Selectors
export const selectSensors = (state: LogicStore) => state.sensors;
export const selectSignals = (state: LogicStore) => state.signals;
export const selectWires = (state: LogicStore) => state.wires;
