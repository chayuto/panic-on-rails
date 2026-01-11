/**
 * Signal Logic Slice
 */

import { v4 as uuidv4 } from 'uuid';
import type { Signal } from '../../../types';
import type { LogicSliceCreator, SignalSlice } from './types';

export const createSignalSlice: LogicSliceCreator<SignalSlice> = (set, get) => ({
    /**
     * Add a signal to a node.
     * 
     * @param nodeId - ID of the node to attach signal to
     * @param offset - Visual offset from node center definition
     * @returns ID of the new signal
     */
    addSignal: (nodeId, offset = { x: 20, y: -20 }) => {
        const signalId = uuidv4();
        const signal: Signal = {
            id: signalId,
            nodeId,
            state: 'red', // Default to red (stop)
            offset,
        };

        set((state) => {
            state.signals[signalId] = signal;
        });

        console.log('[LogicStore] Added signal:', {
            id: signalId.slice(0, 8),
            nodeId: nodeId.slice(0, 8),
            state: 'red',
        });

        return signalId;
    },

    /**
     * Remove a signal and connected wires.
     * 
     * @param signalId - ID of the signal to remove
     */
    removeSignal: (signalId) => {
        set((state) => {
            delete state.signals[signalId];

            // Remove wires connected to this signal
            for (const wireId in state.wires) {
                const wire = state.wires[wireId];
                if (
                    (wire.sourceType === 'signal' && wire.sourceId === signalId) ||
                    (wire.targetType === 'signal' && wire.targetId === signalId)
                ) {
                    delete state.wires[wireId];
                }
            }
        });
    },

    /**
     * Set explicit state of a signal.
     * 
     * @param signalId - ID of the signal
     * @param newState - 'red' | 'green'
     */
    setSignalState: (signalId, newState) => {
        set((state) => {
            const signal = state.signals[signalId];
            if (signal && signal.state !== newState) {
                signal.state = newState;
            }
        });
    },

    /**
     * Toggle a signal between red and green.
     * 
     * @param signalId - ID of the signal
     */
    toggleSignal: (signalId) => {
        set((state) => {
            const signal = state.signals[signalId];
            if (signal) {
                signal.state = signal.state === 'red' ? 'green' : 'red';
            }
        });
    },

    /**
     * Get all signals attached to a specific node.
     * 
     * @param nodeId - ID of the node
     */
    getSignalsAtNode: (nodeId) => {
        const { signals } = get();
        return Object.values(signals).filter((s) => s.nodeId === nodeId);
    },
});
