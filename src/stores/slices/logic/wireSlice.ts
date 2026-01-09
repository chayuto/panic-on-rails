/**
 * Wire Logic Slice
 */

import { v4 as uuidv4 } from 'uuid';
import type { Wire } from '../../../types';
import type { LogicSliceCreator, WireSlice } from './types';

export const createWireSlice: LogicSliceCreator<WireSlice> = (set, get) => ({
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

    removeWire: (wireId) => {
        set((state) => {
            const remaining = Object.fromEntries(
                Object.entries(state.wires).filter(([id]) => id !== wireId)
            );
            return { wires: remaining };
        });
    },

    clearLogic: () => {
        set({
            sensors: {},
            signals: {},
            wires: {},
        });
    },

    getWiresFromSource: (sourceId) => {
        const { wires } = get();
        return Object.values(wires).filter((w) => w.sourceId === sourceId);
    },
});
