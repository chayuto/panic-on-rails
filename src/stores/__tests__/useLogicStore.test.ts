import { describe, it, expect, beforeEach } from 'vitest';
import { useLogicStore } from '../useLogicStore';
import { useTrackStore } from '../useTrackStore';
import { useHistoryStore } from '../useHistoryStore';

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

    describe('Stations', () => {
        it('adds station stops, named in order, and removes them', () => {
            const { addStation, removeStation, getStationsOnEdge } = useLogicStore.getState();
            const a = addStation('edge-1', 124, 240);
            const b = addStation('edge-2', 60, 120);
            expect(getStationsOnEdge('edge-1')).toEqual([{ id: a, edgeId: 'edge-1', position: 124, length: 240, name: 'Station 1' }]);
            expect(useLogicStore.getState().stations[b].name).toBe('Station 2');

            removeStation(a);
            expect(getStationsOnEdge('edge-1')).toEqual([]);
            // The first free name is used again
            const c = addStation('edge-3', 60, 120);
            expect(useLogicStore.getState().stations[c].name).toBe('Station 1');
        });

        it('are cleared with the rest of the logic', () => {
            useLogicStore.getState().addStation('edge-1', 124, 240);
            useLogicStore.getState().clearLogic();
            expect(useLogicStore.getState().stations).toEqual({});
        });

        it('go with the track they stand on, and come back with an undo', () => {
            const track = useTrackStore.getState();
            track.clearLayout();
            const edgeId = track.addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
            useLogicStore.getState().addStation(edgeId, 124, 240);

            useHistoryStore.getState().record();
            useTrackStore.getState().removeTrack(edgeId);
            expect(useLogicStore.getState().stations).toEqual({});

            useHistoryStore.getState().undo();
            expect(Object.values(useLogicStore.getState().stations).map(s => s.edgeId)).toEqual([edgeId]);
        });
    });
});
