/**
 * Logic Store for PanicOnRails
 * 
 * Manages sensors, signals, and wires for the automation system.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
    SensorId,
    SignalId,
    WireId,
    Sensor,
    Signal,
    Wire,
    LogicState,
    SignalState,
    WireAction,
    EdgeId,
    NodeId,
    Vector2,
} from '../types';

// ===========================
// State Interface
// ===========================

interface LogicStoreState {
    sensors: Record<SensorId, Sensor>;
    signals: Record<SignalId, Signal>;
    wires: Record<WireId, Wire>;
}

// ===========================
// Actions Interface  
// ===========================

interface LogicStoreActions {
    // Sensor actions
    addSensor: (edgeId: EdgeId, position: number, length?: number) => SensorId;
    removeSensor: (sensorId: SensorId) => void;
    setSensorState: (sensorId: SensorId, state: LogicState) => void;

    // Signal actions
    addSignal: (nodeId: NodeId, offset?: Vector2) => SignalId;
    removeSignal: (signalId: SignalId) => void;
    setSignalState: (signalId: SignalId, state: SignalState) => void;
    toggleSignal: (signalId: SignalId) => void;

    // Wire actions
    addWire: (
        sourceType: 'sensor' | 'signal',
        sourceId: SensorId | SignalId,
        targetType: 'switch' | 'signal',
        targetId: NodeId | SignalId,
        action: WireAction
    ) => WireId;
    removeWire: (wireId: WireId) => void;

    // Bulk operations
    clearLogic: () => void;

    // Getters
    getSensorsOnEdge: (edgeId: EdgeId) => Sensor[];
    getSignalsAtNode: (nodeId: NodeId) => Signal[];
    getWiresFromSource: (sourceId: SensorId | SignalId) => Wire[];
}

// ===========================
// Initial State
// ===========================

const initialState: LogicStoreState = {
    sensors: {},
    signals: {},
    wires: {},
};

// ===========================
// Store Implementation
// ===========================

export const useLogicStore = create<LogicStoreState & LogicStoreActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ===========================
            // Sensor Actions
            // ===========================

            addSensor: (edgeId, position, length = 30) => {
                const sensorId = uuidv4();
                const sensor: Sensor = {
                    id: sensorId,
                    edgeId,
                    position,
                    length,
                    state: 'off',
                };

                set((state) => ({
                    sensors: {
                        ...state.sensors,
                        [sensorId]: sensor,
                    },
                }));

                console.log('[LogicStore] Added sensor:', {
                    id: sensorId.slice(0, 8),
                    edgeId: edgeId.slice(0, 8),
                    position,
                });

                return sensorId;
            },

            removeSensor: (sensorId) => {
                set((state) => {
                    const remaining = Object.fromEntries(
                        Object.entries(state.sensors).filter(([id]) => id !== sensorId)
                    );

                    // Also remove any wires connected to this sensor
                    const wiresWithoutSource = Object.fromEntries(
                        Object.entries(state.wires).filter(
                            ([, wire]) => !(wire.sourceType === 'sensor' && wire.sourceId === sensorId)
                        )
                    );

                    return {
                        sensors: remaining,
                        wires: wiresWithoutSource,
                    };
                });
            },

            setSensorState: (sensorId, newState) => {
                set((state) => {
                    const sensor = state.sensors[sensorId];
                    if (!sensor || sensor.state === newState) return state;

                    return {
                        sensors: {
                            ...state.sensors,
                            [sensorId]: {
                                ...sensor,
                                state: newState,
                            },
                        },
                    };
                });
            },

            // ===========================
            // Signal Actions
            // ===========================

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

            // ===========================
            // Wire Actions
            // ===========================

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

            // ===========================
            // Bulk Operations
            // ===========================

            clearLogic: () => {
                set(initialState);
            },

            // ===========================
            // Getters
            // ===========================

            getSensorsOnEdge: (edgeId) => {
                const { sensors } = get();
                return Object.values(sensors).filter((s) => s.edgeId === edgeId);
            },

            getSignalsAtNode: (nodeId) => {
                const { signals } = get();
                return Object.values(signals).filter((s) => s.nodeId === nodeId);
            },

            getWiresFromSource: (sourceId) => {
                const { wires } = get();
                return Object.values(wires).filter((w) => w.sourceId === sourceId);
            },
        }),
        {
            name: 'panic-on-rails-logic-v1',
        }
    )
);
