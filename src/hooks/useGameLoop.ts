/**
 * Game loop hook - Orchestrator for simulation systems
 */

import { useEffect, useRef, useCallback } from 'react';
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
    const {
        trains, isRunning, speedMultiplier,
        updateTrainPosition, setCrashed,
        crashedParts, addCrashedParts, setCrashedParts
    } = useSimulationStore();
    const { edges, nodes, toggleSwitch } = useTrackStore();
    const { sensors, wires, setSensorState, setSignalState, signals } = useLogicStore();
    const { triggerScreenShake, triggerFlash } = useEffectsStore();

    const updateTrains = useCallback((deltaTime: number) => {
        const dt = deltaTime * speedMultiplier;

        // SYSTEM 1: Movement
        Object.values(trains).forEach((train) => {
            const update = calculateTrainMovement(train, dt, edges, nodes);
            if (update) {
                updateTrainPosition(
                    update.trainId,
                    update.distance,
                    update.edgeId,
                    update.direction,
                    update.bounceTime
                );
            }
        });
    }, [trains, edges, nodes, speedMultiplier, updateTrainPosition]);

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

            // 1. Movement System
            updateTrains(cappedDelta);

            // 2. Collision System
            const collisionEvents = checkCollisions(trains, edges);
            collisionEvents.forEach(event => {
                // Apply physics effects
                addCrashedParts(event.debris);

                // Visual/Audio events
                triggerScreenShake(8 + event.severity * 4, 200 + event.severity * 100);
                triggerFlash(event.location, { color: '#FFFFFF', duration: 100 });
                playSound('crash');

                // Mark trains as crashed
                event.trainIds.forEach(id => setCrashed(id));
            });

            // 3. Debris System
            if (crashedParts.length > 0) {
                const updatedParts = updateCrashedParts(crashedParts, cappedDelta, 500); // 500 is maxAge, moved to PHYSICS but passed as arg here or used default?
                // The updateCrashedParts fn signature is (parts, dt, groundY). Wait.
                // Looking at prev file content:
                // export function updateCrashedParts(parts: CrashedPart[], dt: number, groundY: number = GROUND_Y): CrashedPart[]
                // In useGameLoop line 91: updateCrashedParts(crashedParts, cappedDelta, 500);
                // 500 passed as groundY?
                // But in crashPhysics, groundY defaults to 600.
                // In game loop it explicitly passes 500.
                // I should probably keep it 500 OR use the config if 500 was just a magic number for "ground level".
                // PHYSICS.GROUND_Y is 600.
                // Let's assume 500 was the intent for this specific view.
                // I will NOT replace 500 with PHYSICS.GROUND_Y if they differ.
                // But I should check if there's a constant for it.
                // For now, I'll only replace DELTA_TIME_CAP.
                setCrashedParts(updatedParts);
            }

            // 4. Signal/Sensor System
            const sensorUpdates = updateSensors(trains, sensors, wires);
            sensorUpdates.forEach(update => {
                setSensorState(update.sensorId, update.newState);

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
                        // Access signal state from logic store safely? 
                        // LogicStore updates usually atomic.
                        // Ideally pass signals explicitly like trains. 
                        // For now we access via closure or store getter if needed.
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

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [
        isSimulating, isRunning, updateTrains, trains, edges, nodes,
        sensors, wires, signals, // Added signals to deps
        setCrashed, setCrashedParts, crashedParts, addCrashedParts,
        setSensorState, setSignalState, toggleSwitch,
        triggerFlash, triggerScreenShake
    ]);

    return { getPositionOnEdge };
}
