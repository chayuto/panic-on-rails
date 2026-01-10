/**
 * Signal Logic Slice
 */

import { v4 as uuidv4 } from 'uuid';
import type { Signal, SignalState } from '../../../types';
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

        set((state) => ({
            signals: {
                ...state.signals,
                [signalId]: signal,
            },
        }));

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
            const remaining = Object.fromEntries(
                Object.entries(state.signals).filter(([id]) => id !== signalId)
            );

            // Remove wires connected to this signal (as source or target)
            const wiresWithoutSignal = Object.fromEntries(
                Object.entries(state.wires).filter(
                    ([, wire]) => !(
                        (wire.sourceType === 'signal' && wire.sourceId === signalId) ||
                        (wire.targetType === 'signal' && wire.targetId === signalId)
                    )
                )
            );

            return {
                signals: remaining,
                wires: wiresWithoutSignal,
            };
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
            if (!signal || signal.state === newState) return state;

            return {
                signals: {
                    ...state.signals,
                    [signalId]: {
                        ...signal,
                        state: newState,
                    },
                },
            };
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
            if (!signal) return state;

            const newState: SignalState = signal.state === 'red' ? 'green' : 'red';

            return {
                signals: {
                    ...state.signals,
                    [signalId]: {
                        ...signal,
                        state: newState,
                    },
                },
            };
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
