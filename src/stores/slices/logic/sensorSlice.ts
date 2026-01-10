/**
 * Sensor Logic Slice
 */

import { v4 as uuidv4 } from 'uuid';
import type { Sensor } from '../../../types';
import type { LogicSliceCreator, SensorSlice } from './types';

export const createSensorSlice: LogicSliceCreator<SensorSlice> = (set, get) => ({
    /**
     * Add a new sensor to a track edge.
     * 
     * @param edgeId - ID of the edge to place sensor on
     * @param position - Distance from start of edge
     * @param length - Length of sensor activation zone (default: 30)
     * @returns ID of the new sensor
     */
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

    /**
     * Remove a sensor and cleanup any connected wires.
     * 
     * @param sensorId - ID of the sensor to remove
     */
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

    /**
     * Update the active state of a sensor.
     * Typically called by the simulation loop when a train passes over.
     * 
     * @param sensorId - ID of the sensor
     * @param newState - 'on' | 'off'
     */
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

    /**
     * Get all sensors located on a specific edge.
     * 
     * @param edgeId - ID of the edge
     * @returns Array of sensors on that edge
     */
    getSensorsOnEdge: (edgeId) => {
        const { sensors } = get();
        return Object.values(sensors).filter((s) => s.edgeId === edgeId);
    },
});
