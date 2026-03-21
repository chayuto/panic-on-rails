/**
 * Game loop hook - Orchestrator for simulation systems
 *
 * Uses getState() inside rAF to avoid tearing down the loop on every state change.
 * The useEffect only depends on isSimulating and isRunning.
 */

import { useEffect, useRef } from 'react';
import type { TrainId } from '../types';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useLogicStore } from '../stores/useLogicStore';
import { useIsSimulating } from '../stores/useModeStore';
import { useEffectsStore } from '../stores/useEffectsStore';
import { playSound, playSwitchSound } from '../utils/audioManager';
import { updateCrashedParts } from '../utils/crashPhysics';

// Sub-systems
import { calculateTrainMovement } from '../simulation/movement';
import { checkCollisions } from '../simulation/collision';
import { updateSensors } from '../simulation/signals';
import { getPositionOnEdge } from '../utils/trainGeometry'; // Re-export for compatibility
import { TIMING } from '../config/timing';

export function useGameLoop() {
    const lastTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number>(0);

    const isSimulating = useIsSimulating();
    const isRunning = useSimulationStore(s => s.isRunning);

    useEffect(() => {
        if (!isSimulating || !isRunning) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            lastTimeRef.current = 0;
            return;
        }

        const loop = (timestamp: number) => {
            if (!lastTimeRef.current) {
                lastTimeRef.current = timestamp;
            }

            const deltaTime = (timestamp - lastTimeRef.current) / 1000;
            lastTimeRef.current = timestamp;

            const cappedDelta = Math.min(deltaTime, TIMING.DELTA_TIME_CAP);

            try {
                // Read fresh state inside rAF
                const { edges, nodes, toggleSwitch } = useTrackStore.getState();
                const simState = useSimulationStore.getState();
                const { speedMultiplier, updateTrainPosition, setCrashed, addCrashedParts, setCrashedParts } = simState;
                const logicState = useLogicStore.getState();
                const { sensors, wires, setSensorState, setSignalState, signals } = logicState;
                const { triggerScreenShake, triggerFlash } = useEffectsStore.getState();

                const dt = cappedDelta * speedMultiplier;
                const { logEvent, tickElapsed } = simState;

                // Advance simulation clock
                tickElapsed(dt);

                // 1. Movement System — read trains fresh, update each
                const trainsBefore = useSimulationStore.getState().trains;
                Object.values(trainsBefore).forEach((train) => {
                    const update = calculateTrainMovement(train, dt, edges, nodes);
                    if (update) {
                        // Log edge transitions and bounces
                        if (update.edgeId !== train.currentEdgeId) {
                            const part = edges[update.edgeId]?.partId ?? '?';
                            logEvent('traverse', train.id, update.edgeId,
                                `${edges[train.currentEdgeId]?.partId ?? '?'} → ${part}`);
                        }
                        if (update.bounceTime !== undefined) {
                            logEvent('bounce', train.id, update.edgeId, 'dead end');
                        }
                        updateTrainPosition(
                            update.trainId,
                            update.distance,
                            update.edgeId,
                            update.direction,
                            update.bounceTime
                        );
                    }
                });

                // 2. Collision System — re-read trains after movement for fresh positions
                const freshTrains = useSimulationStore.getState().trains;
                const collisionEvents = checkCollisions(freshTrains, edges);
                collisionEvents.forEach(event => {
                    // Apply physics effects
                    addCrashedParts(event.debris);

                    // Visual/Audio events
                    triggerScreenShake(8 + event.severity * 4, 200 + event.severity * 100);
                    triggerFlash(event.location, { color: '#FFFFFF', duration: 100 });
                    playSound('crash');

                    // Mark trains as crashed and log collision
                    event.trainIds.forEach(id => {
                        setCrashed(id);
                        const train = freshTrains[id];
                        if (train) {
                            logEvent('collision', id, train.currentEdgeId,
                                `crashed with ${event.trainIds.filter(t => t !== id).join(', ')}`);
                        }
                    });
                });

                // 3. Debris System
                const { crashedParts } = useSimulationStore.getState();
                if (crashedParts.length > 0) {
                    const updatedParts = updateCrashedParts(crashedParts, cappedDelta, 500);
                    setCrashedParts(updatedParts);
                }

                // 4. Signal/Sensor System
                const sensorUpdates = updateSensors(freshTrains, sensors, wires);
                sensorUpdates.forEach(update => {
                    setSensorState(update.sensorId, update.newState);

                    // Log sensor trigger
                    if (update.newState === 'on') {
                        const sensor = sensors[update.sensorId];
                        if (sensor) {
                            logEvent('sensor', '' as TrainId, sensor.edgeId,
                                `sensor ${update.sensorId.slice(0, 8)} triggered`);
                        }
                    }

                    // Handle triggered wire actions
                    update.triggeredActions.forEach(action => {
                        if (action.targetType === 'switch') {
                            if (action.action === 'toggle') {
                                toggleSwitch(action.targetId);
                            } else if (action.action === 'set_main') {
                                const node = nodes[action.targetId];
                                if (node?.switchState !== 0) toggleSwitch(action.targetId);
                            } else if (action.action === 'set_branch') {
                                const node = nodes[action.targetId];
                                if (node?.switchState !== 1) toggleSwitch(action.targetId);
                            }
                            playSwitchSound('n-scale');
                        } else if (action.targetType === 'signal') {
                            const signal = signals[action.targetId];

                            if (action.action === 'toggle') {
                                setSignalState(action.targetId, signal?.state === 'red' ? 'green' : 'red');
                            } else if (action.action === 'set_red') {
                                setSignalState(action.targetId, 'red');
                            } else if (action.action === 'set_green') {
                                setSignalState(action.targetId, 'green');
                            }
                        }
                    });
                });
            } catch (err) {
                console.error("Simulation Loop Error:", err);
                const { setError, setRunning } = useSimulationStore.getState();
                setError(err instanceof Error ? err.message : 'Unknown simulation error');
                setRunning(false);
                return; // Stop the loop
            }

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isSimulating, isRunning]);

    return { getPositionOnEdge };
}
