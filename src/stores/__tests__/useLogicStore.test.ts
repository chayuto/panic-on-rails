import { describe, it, expect, beforeEach } from 'vitest';
import { useLogicStore } from '../useLogicStore';

describe('useLogicStore', () => {
    beforeEach(() => {
        useLogicStore.getState().clearLogic();
    });

    describe('Sensors', () => {
        it('should add and remove sensors', () => {
            const { addSensor, removeSensor, getSensorsOnEdge } = useLogicStore.getState();

            const sensorId = addSensor('edge-1', 50, 30);

            let sensors = getSensorsOnEdge('edge-1');
            expect(sensors).toHaveLength(1);
            expect(sensors[0].id).toBe(sensorId);
            expect(sensors[0].position).toBe(50);

            removeSensor(sensorId);

            sensors = getSensorsOnEdge('edge-1');
            expect(sensors).toHaveLength(0);
        });

        it('should update sensor state', () => {
            const { addSensor, setSensorState } = useLogicStore.getState();
            const sensorId = addSensor('edge-1', 50);

            setSensorState(sensorId, 'on');
            expect(useLogicStore.getState().sensors[sensorId].state).toBe('on');

            setSensorState(sensorId, 'off');
            expect(useLogicStore.getState().sensors[sensorId].state).toBe('off');
        });
    });

    describe('Signals', () => {
        it('should add and remove signals', () => {
            const { addSignal, removeSignal, getSignalsAtNode } = useLogicStore.getState();
            const signalId = addSignal('node-1');

            let signals = getSignalsAtNode('node-1');
            expect(signals).toHaveLength(1);
            expect(signals[0].id).toBe(signalId);
            expect(signals[0].state).toBe('red'); // Default

            removeSignal(signalId);
            signals = getSignalsAtNode('node-1');
            expect(signals).toHaveLength(0);
        });

        it('should toggle signal state', () => {
            const { addSignal, toggleSignal, setSignalState } = useLogicStore.getState();
            const signalId = addSignal('node-1');

            toggleSignal(signalId);
            expect(useLogicStore.getState().signals[signalId].state).toBe('green');

            toggleSignal(signalId);
            expect(useLogicStore.getState().signals[signalId].state).toBe('red');

            setSignalState(signalId, 'green');
            expect(useLogicStore.getState().signals[signalId].state).toBe('green');
        });
    });

    describe('Wires', () => {
        it('should create and remove wires', () => {
            const { addWire, removeWire, getWiresFromSource } = useLogicStore.getState();

            // sourceId and targetId don't strictly need to exist for addWire to succeed in current impl,
            // but for realism we can pretend.
            const wireId = addWire('sensor', 'sensor-1', 'signal', 'signal-1', 'toggle');

            let wires = getWiresFromSource('sensor-1');
            expect(wires).toHaveLength(1);
            expect(wires[0].id).toBe(wireId);
            expect(wires[0].targetId).toBe('signal-1');

            removeWire(wireId);
            wires = getWiresFromSource('sensor-1');
            expect(wires).toHaveLength(0);
        });

        it('should automatically remove wires when sensor is removed', () => {
            const { addSensor, addSignal, addWire, removeSensor, getWiresFromSource } = useLogicStore.getState();

            const sensorId = addSensor('edge-1', 10);
            const signalId = addSignal('node-1');
            const wireId = addWire('sensor', sensorId, 'signal', signalId, 'toggle');

            expect(getWiresFromSource(sensorId)).toHaveLength(1);

            removeSensor(sensorId);

            // Wire should be gone because its source was removed
            expect(getWiresFromSource(sensorId)).toHaveLength(0);
            expect(useLogicStore.getState().wires[wireId]).toBeUndefined();
        });

        it('should automatically remove wires when signal is removed', () => {
            const { addSensor, addSignal, addWire, removeSignal, getWiresFromSource } = useLogicStore.getState();

            const sensorId = addSensor('edge-1', 10);
            const signalId = addSignal('node-1');
            const wireId = addWire('sensor', sensorId, 'signal', signalId, 'toggle');

            expect(getWiresFromSource(sensorId)).toHaveLength(1);

            removeSignal(signalId); // Remove target

            // Wire should be gone because its target was removed
            expect(useLogicStore.getState().wires[wireId]).toBeUndefined();
        });
    });
});
