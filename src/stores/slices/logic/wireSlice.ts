/**
 * Wire Logic Slice
 */

import { v4 as uuidv4 } from 'uuid';
import type { Wire } from '../../../types';
import type { LogicSliceCreator, WireSlice } from './types';

export const createWireSlice: LogicSliceCreator<WireSlice> = (set, get) => ({
    /**
     * Create a logical wire connection between components.
     * 
     * @param sourceType - 'sensor' | 'signal'
     * @param sourceId - ID of source component
     * @param targetType - 'signal' | 'switch'
     * @param targetId - ID of target component
     * @param action - Action to perform on trigger (e.g., 'toggle', 'set_red')
     * @returns ID of the new wire
     */
    addWire: (sourceType, sourceId, targetType, targetId, action) => {
        const wireId = uuidv4();
        const wire: Wire = {
            id: wireId,
            sourceType,
            sourceId,
            targetType,
            targetId,
            action,
            triggerOn: 'rising', // Default to trigger on activation
        };

        set((state) => ({
            wires: {
                ...state.wires,
                [wireId]: wire,
            },
        }));

        console.log('[LogicStore] Added wire:', {
            id: wireId.slice(0, 8),
            source: `${sourceType}:${sourceId.slice(0, 8)}`,
            target: `${targetType}:${targetId.slice(0, 8)}`,
            action,
        });

        return wireId;
    },

    /**
     * Remove a wire.
     * 
     * @param wireId - ID of the wire to remove
     */
    removeWire: (wireId) => {
        set((state) => {
            const remaining = Object.fromEntries(
                Object.entries(state.wires).filter(([id]) => id !== wireId)
            );
            return { wires: remaining };
        });
    },

    /**
     * Clear all logic components (sensors, signals, wires).
     */
    clearLogic: () => {
        set({
            sensors: {},
            signals: {},
            wires: {},
        });
    },

    /**
     * Get all wires originating from a specific source.
     * 
     * @param sourceId - ID of the source component
     */
    getWiresFromSource: (sourceId) => {
        const { wires } = get();
        return Object.values(wires).filter((w) => w.sourceId === sourceId);
    },
});
