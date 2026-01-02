import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useLogicStore } from '../stores/useLogicStore';
import { playSound } from '../utils/audioManager';
import { detectCollisions } from '../utils/collisionManager';
import type { Train, TrackEdge, Vector2 } from '../types';

/**
 * Calculate world position from edge geometry and distance along edge
 */
function getPositionOnEdge(edge: TrackEdge, distance: number): Vector2 {
    const progress = distance / edge.length;

    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        return {
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
        };
    } else {
        // Arc geometry
        const { center, radius, startAngle, endAngle } = edge.geometry;
        const angle = startAngle + (endAngle - startAngle) * progress;
        return {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
        };
    }
}

/**
 * Game loop hook - updates train positions at 60fps
 */
export function useGameLoop() {
    const lastTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number>(0);

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

            // Handle reaching end of edge
            if (newDistance > edge.length) {
                // Get the exit node
                const exitNodeId = train.direction === 1 ? edge.endNodeId : edge.startNodeId;
                const exitNode = nodes[exitNodeId];

                if (exitNode) {
                    // Find other connections (excluding current edge)
                    const otherConnections = exitNode.connections.filter(
                        id => id !== train.currentEdgeId
                    );

                    if (otherConnections.length > 0) {
                        // Determine which edge to take
                        let nextEdgeId: string;

                        // If this is a switch node, use switch state to decide
                        if (exitNode.type === 'switch' && exitNode.switchBranches) {
                            const [mainEdgeId, branchEdgeId] = exitNode.switchBranches;
                            // Use switch state: 0 = main, 1 = branch
                            nextEdgeId = exitNode.switchState === 0 ? mainEdgeId : branchEdgeId;
                            // Ensure the selected edge is in our available connections
                            if (!otherConnections.includes(nextEdgeId)) {
                                // Fallback if switch edge not available
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
                // Same logic for going backwards
                const exitNodeId = train.direction === 1 ? edge.startNodeId : edge.endNodeId;
                const exitNode = nodes[exitNodeId];

                if (exitNode) {
                    const otherConnections = exitNode.connections.filter(
                        id => id !== train.currentEdgeId
                    );

                    if (otherConnections.length > 0) {
                        // Determine which edge to take
                        let nextEdgeId: string;

                        // If this is a switch node, use switch state to decide
                        if (exitNode.type === 'switch' && exitNode.switchBranches) {
                            const [mainEdgeId, branchEdgeId] = exitNode.switchBranches;
                            nextEdgeId = exitNode.switchState === 0 ? mainEdgeId : branchEdgeId;
                            if (!otherConnections.includes(nextEdgeId)) {
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
        if (!isRunning) {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
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
    }, [isRunning, updateTrains]);

    // Return position calculator for TrainLayer
    return { getPositionOnEdge };
}
