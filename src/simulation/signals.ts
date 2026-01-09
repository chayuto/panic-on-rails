/**
 * Signal and Sensor System
 * 
 * Handles sensor activation and control logic (wires/signals).
 */

import type { Train, Sensor, Wire } from '../types';

export interface WireActionEffect {
    targetId: string;
    targetType: 'switch' | 'signal';
    action: string;
}

export interface SensorUpdate {
    sensorId: string;
    newState: 'on' | 'off';
    triggeredActions: WireActionEffect[];
}

/**
 * Updates sensors based on train positions and determines triggered actions.
 */
export function updateSensors(
    trains: Record<string, Train>,
    sensors: Record<string, Sensor>,
    wires: Record<string, Wire>
): SensorUpdate[] {
    const updates: SensorUpdate[] = [];

    Object.values(sensors).forEach((sensor) => {
        const trainOnSensor = Object.values(trains).some((train) => {
            if (train.crashed) return false;
            if (train.currentEdgeId !== sensor.edgeId) return false;

            // Check if train is within sensor zone
            const distance = Math.abs(train.distanceAlongEdge - sensor.position);
            return distance < sensor.length / 2;
        });

        const newState = trainOnSensor ? 'on' : 'off';

        // Only report if state changed
        if (sensor.state !== newState) {
            const triggeredActions: WireActionEffect[] = [];

            // If triggered ON, process wires
            if (newState === 'on') {
                Object.values(wires).forEach((wire) => {
                    if (wire.sourceType === 'sensor' && wire.sourceId === sensor.id) {
                        triggeredActions.push({
                            targetId: wire.targetId,
                            targetType: wire.targetType,
                            action: wire.action
                        });
                    }
                });
            }

            updates.push({
                sensorId: sensor.id,
                newState,
                triggeredActions
            });
        }
    });

    return updates;
}
