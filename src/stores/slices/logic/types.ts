/**
 * Logic Store Types
 */

import type { StateCreator } from 'zustand';
import 'zustand/middleware/immer';
import type {
    SensorId, SignalId, WireId,
    Sensor, Signal, Wire,
    LogicState, SignalState, WireAction,
    EdgeId, NodeId, Vector2
} from '../../../types';

export interface LogicStateData {
    sensors: Record<SensorId, Sensor>;
    signals: Record<SignalId, Signal>;
    wires: Record<WireId, Wire>;
}

export interface SensorSlice {
    addSensor: (edgeId: EdgeId, position: number, length?: number) => SensorId;
    removeSensor: (sensorId: SensorId) => void;
    setSensorState: (sensorId: SensorId, state: LogicState) => void;
    getSensorsOnEdge: (edgeId: EdgeId) => Sensor[];
}

export interface SignalSlice {
    addSignal: (nodeId: NodeId, offset?: Vector2) => SignalId;
    removeSignal: (signalId: SignalId) => void;
    setSignalState: (signalId: SignalId, state: SignalState) => void;
    toggleSignal: (signalId: SignalId) => void;
    getSignalsAtNode: (nodeId: NodeId) => Signal[];
}

export interface WireSlice {
    addWire: (
        sourceType: 'sensor' | 'signal',
        sourceId: SensorId | SignalId,
        targetType: 'switch' | 'signal',
        targetId: NodeId | SignalId,
        action: WireAction
    ) => WireId;
    removeWire: (wireId: WireId) => void;
    clearLogic: () => void;
    getWiresFromSource: (sourceId: SensorId | SignalId) => Wire[];
}

// Combined Store Type
export type LogicStore = LogicStateData & SensorSlice & SignalSlice & WireSlice;

// Slice Creator Type
export type LogicSliceCreator<T> = StateCreator<
    LogicStore,
    [['zustand/immer', never]],
    [],
    T
>;
