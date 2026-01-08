import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useLogicStore } from '../stores/useLogicStore';
import { useIsSimulating } from '../stores/useModeStore';
import { playSound } from '../utils/audioManager';
import { detectCollisions } from '../utils/collisionManager';
import { getPositionOnEdge } from '../utils/trainGeometry';
import { getSwitchExitEdge } from '../utils/switchRouting';
import type { Train } from '../types';

/**
 * Game loop hook - updates train positions at 60fps (simulate mode only)
 */
export function useGameLoop() {
    const lastTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number>(0);

    const isSimulating = useIsSimulating();
    const { trains, isRunning, speedMultiplier, updateTrainPosition, setCrashed } = useSimulationStore();
    const { edges, nodes, toggleSwitch } = useTrackStore();
    const { sensors, wires, setSensorState, setSignalState } = useLogicStore();

    const updateTrains = useCallback((deltaTime: number) => {
        // Scale delta by speed multiplier
        const dt = deltaTime * speedMultiplier;

        Object.values(trains).forEach((train: Train) => {
            const edge = edges[train.currentEdgeId];
            if (!edge) return;

            // Calculate new distance along edge
            let newDistance = train.distanceAlongEdge + train.speed * train.direction * dt;
            let newDirection = train.direction;
            let newEdgeId = train.currentEdgeId;
            let bounceTime: number | undefined = undefined;

            if (newDistance > edge.length) {
                // Train went past the END of edge, so exit via endNodeId
                const exitNodeId = edge.endNodeId;
                const exitNode = nodes[exitNodeId];

                if (exitNode) {
                    // Find other connections (excluding current edge)
                    const otherConnections = exitNode.connections.filter(
                        id => id !== train.currentEdgeId
                    );

                    if (otherConnections.length > 0) {
                        // Determine which edge to take
                        let nextEdgeId: string;

                        // If this is a switch node, use proper switch routing
                        if (exitNode.type === 'switch' && exitNode.switchBranches) {
                            const switchExit = getSwitchExitEdge(exitNode, train.currentEdgeId);
                            if (switchExit && otherConnections.includes(switchExit)) {
                                nextEdgeId = switchExit;
                            } else {
                                // Fallback if switch routing fails
                                nextEdgeId = otherConnections[0];
                            }
                        } else {
                            // Regular junction: take first available
                            nextEdgeId = otherConnections[0];
                        }

                        const nextEdge = edges[nextEdgeId];

                        if (nextEdge) {
                            // Determine entry direction based on which node we entered
                            const enterFromStart = nextEdge.startNodeId === exitNodeId;
                            newEdgeId = nextEdgeId;
                            newDirection = enterFromStart ? 1 : -1;
                            newDistance = enterFromStart ? (newDistance - edge.length) : (nextEdge.length - (newDistance - edge.length));
                        }
                    } else {
                        // Dead end - BOUNCE!
                        newDirection = -train.direction as 1 | -1;
                        newDistance = edge.length - (newDistance - edge.length);
                        bounceTime = performance.now();

                        // Play bounce sound
                        playSound('bounce');
                    }
                }
            } else if (newDistance < 0) {
                // Train went past the START of edge (distance=0), so exit via startNodeId
                const exitNodeId = edge.startNodeId;
                const exitNode = nodes[exitNodeId];

                if (exitNode) {
                    const otherConnections = exitNode.connections.filter(
                        id => id !== train.currentEdgeId
                    );

                    if (otherConnections.length > 0) {
                        // Determine which edge to take
                        let nextEdgeId: string;

                        // If this is a switch node, use proper switch routing
                        if (exitNode.type === 'switch' && exitNode.switchBranches) {
                            const switchExit = getSwitchExitEdge(exitNode, train.currentEdgeId);
                            if (switchExit && otherConnections.includes(switchExit)) {
                                nextEdgeId = switchExit;
                            } else {
                                nextEdgeId = otherConnections[0];
                            }
                        } else {
                            nextEdgeId = otherConnections[0];
                        }

                        const nextEdge = edges[nextEdgeId];

                        if (nextEdge) {
                            const enterFromEnd = nextEdge.endNodeId === exitNodeId;
                            newEdgeId = nextEdgeId;
                            newDirection = enterFromEnd ? -1 : 1;
                            newDistance = enterFromEnd ? (nextEdge.length + newDistance) : (-newDistance);
                        }
                    } else {
                        // Dead end - BOUNCE!
                        newDirection = -train.direction as 1 | -1;
                        newDistance = Math.abs(newDistance);
                        bounceTime = performance.now();

                        // Play bounce sound
                        playSound('bounce');
                    }
                }
            }

            // Clamp distance
            newDistance = Math.max(0, Math.min(newDistance, edges[newEdgeId]?.length || edge.length));

            // Update train position (pass bounceTime if bounce occurred)
            updateTrainPosition(train.id, newDistance, newEdgeId, newDirection, bounceTime);
        });
    }, [trains, edges, nodes, speedMultiplier, updateTrainPosition]);

    useEffect(() => {
        // Only run game loop if BOTH in simulate mode AND running
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

            // Cap delta time to prevent huge jumps
            const cappedDelta = Math.min(deltaTime, 0.1);

            updateTrains(cappedDelta);

            // Check for collisions
            const collisions = detectCollisions(trains);
            collisions.forEach(({ trainA, trainB }) => {
                if (!trainA.crashed) {
                    setCrashed(trainA.id);
                }
                if (!trainB.crashed) {
                    setCrashed(trainB.id);
                }
                playSound('crash');
            });

            // Update sensor states based on train positions
            Object.values(sensors).forEach((sensor) => {
                const trainOnSensor = Object.values(trains).some((train) => {
                    if (train.crashed) return false;
                    if (train.currentEdgeId !== sensor.edgeId) return false;

                    // Check if train is within sensor zone
                    const distance = Math.abs(train.distanceAlongEdge - sensor.position);
                    return distance < sensor.length / 2;
                });

                const newState = trainOnSensor ? 'on' : 'off';
                if (sensor.state !== newState) {
                    setSensorState(sensor.id, newState);

                    // Process wires triggered by this sensor
                    if (newState === 'on') {
                        Object.values(wires).forEach((wire) => {
                            if (wire.sourceType === 'sensor' && wire.sourceId === sensor.id) {
                                // Execute wire action
                                if (wire.targetType === 'switch') {
                                    if (wire.action === 'toggle') {
                                        toggleSwitch(wire.targetId);
                                    } else if (wire.action === 'set_main') {
                                        // Set to main (state 0)
                                        const node = nodes[wire.targetId];
                                        if (node?.switchState !== 0) toggleSwitch(wire.targetId);
                                    } else if (wire.action === 'set_branch') {
                                        // Set to branch (state 1)
                                        const node = nodes[wire.targetId];
                                        if (node?.switchState !== 1) toggleSwitch(wire.targetId);
                                    }
                                    playSound('switch');
                                } else if (wire.targetType === 'signal') {
                                    if (wire.action === 'toggle') {
                                        // Toggle signal
                                        const signal = useLogicStore.getState().signals[wire.targetId];
                                        setSignalState(wire.targetId, signal?.state === 'red' ? 'green' : 'red');
                                    } else if (wire.action === 'set_red') {
                                        setSignalState(wire.targetId, 'red');
                                    } else if (wire.action === 'set_green') {
                                        setSignalState(wire.targetId, 'green');
                                    }
                                }
                            }
                        });
                    }
                }
            });

            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isSimulating, isRunning, updateTrains, trains, nodes, sensors, wires, setCrashed, setSensorState, setSignalState, toggleSwitch]);

    // Re-export position calculator from trainGeometry for backward compatibility
    return { getPositionOnEdge };
}
