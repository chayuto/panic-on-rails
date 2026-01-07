/**
 * useHoveredElement Hook
 * 
 * Determines which canvas element (train, edge, node, sensor, signal) 
 * is currently under the given world coordinates.
 * 
 * Used by SimulationTooltip to show element details on hover.
 */

import { useMemo } from 'react';
import { useTrackStore } from '../stores/useTrackStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useLogicStore } from '../stores/useLogicStore';
import { getPositionOnEdge } from '../utils/trainGeometry';
import { pointToLineDistance, pointToArcDistance } from '../utils/hitTesting';
import type { Vector2, Train, TrackEdge, TrackNode, Sensor, Signal } from '../types';

// Detection radius for different element types
const TRAIN_HIT_RADIUS = 20;
const NODE_HIT_RADIUS = 15;
const EDGE_HIT_RADIUS = 12;
const SENSOR_HIT_RADIUS = 15;
const SIGNAL_HIT_RADIUS = 15;

// Types for hovered elements
export type HoveredElementType = 'train' | 'edge' | 'node' | 'switch' | 'sensor' | 'signal';

export interface HoveredTrain {
    type: 'train';
    train: Train;
    edge: TrackEdge;
}

export interface HoveredEdge {
    type: 'edge';
    edge: TrackEdge;
    startNode: TrackNode;
    endNode: TrackNode;
}

export interface HoveredNode {
    type: 'node';
    node: TrackNode;
}

export interface HoveredSwitch {
    type: 'switch';
    node: TrackNode;
}

export interface HoveredSensor {
    type: 'sensor';
    sensor: Sensor;
    edge: TrackEdge;
}

export interface HoveredSignal {
    type: 'signal';
    signal: Signal;
    node: TrackNode;
}

export type HoveredElement =
    | HoveredTrain
    | HoveredEdge
    | HoveredNode
    | HoveredSwitch
    | HoveredSensor
    | HoveredSignal
    | null;

/**
 * Calculate distance from a point to an edge
 * Uses consolidated functions from hitTesting.ts
 */
function distanceToEdge(point: Vector2, edge: TrackEdge): number {
    if (edge.geometry.type === 'straight') {
        return pointToLineDistance(point, edge.geometry.start, edge.geometry.end);
    } else {
        const { center, radius, startAngle, endAngle } = edge.geometry;
        return pointToArcDistance(point, center, radius, startAngle, endAngle);
    }
}

/**
 * Hook to find the element under the current mouse position
 */
export function useHoveredElement(worldPos: Vector2 | null): HoveredElement {
    const { nodes, edges } = useTrackStore();
    const { trains } = useSimulationStore();
    const { sensors, signals } = useLogicStore();

    return useMemo(() => {
        if (!worldPos) return null;

        let closestElement: HoveredElement = null;
        let closestDistance = Infinity;

        // Check trains first (highest priority)
        for (const train of Object.values(trains)) {
            const edge = edges[train.currentEdgeId];
            if (!edge) continue;

            const trainPos = getPositionOnEdge(edge, train.distanceAlongEdge);
            const distance = Math.hypot(worldPos.x - trainPos.x, worldPos.y - trainPos.y);

            if (distance < TRAIN_HIT_RADIUS && distance < closestDistance) {
                closestDistance = distance;
                closestElement = { type: 'train', train, edge };
            }
        }

        // If we found a train, return it immediately (trains have priority)
        if (closestElement?.type === 'train') return closestElement;

        // Check sensors
        for (const sensor of Object.values(sensors)) {
            const edge = edges[sensor.edgeId];
            if (!edge) continue;

            const sensorPos = getPositionOnEdge(edge, sensor.position);
            const distance = Math.hypot(worldPos.x - sensorPos.x, worldPos.y - sensorPos.y);

            if (distance < SENSOR_HIT_RADIUS && distance < closestDistance) {
                closestDistance = distance;
                closestElement = { type: 'sensor', sensor, edge };
            }
        }

        // Check signals
        for (const signal of Object.values(signals)) {
            const node = nodes[signal.nodeId];
            if (!node) continue;

            const distance = Math.hypot(worldPos.x - node.position.x, worldPos.y - node.position.y);

            if (distance < SIGNAL_HIT_RADIUS && distance < closestDistance) {
                closestDistance = distance;
                closestElement = { type: 'signal', signal, node };
            }
        }

        // Check nodes (including switches)
        for (const node of Object.values(nodes)) {
            const distance = Math.hypot(worldPos.x - node.position.x, worldPos.y - node.position.y);

            if (distance < NODE_HIT_RADIUS && distance < closestDistance) {
                closestDistance = distance;
                if (node.type === 'switch') {
                    closestElement = { type: 'switch', node };
                } else {
                    closestElement = { type: 'node', node };
                }
            }
        }

        // Check edges (lowest priority)
        for (const edge of Object.values(edges)) {
            const distance = distanceToEdge(worldPos, edge);

            if (distance < EDGE_HIT_RADIUS && distance < closestDistance) {
                const startNode = nodes[edge.startNodeId];
                const endNode = nodes[edge.endNodeId];
                if (startNode && endNode) {
                    closestDistance = distance;
                    closestElement = { type: 'edge', edge, startNode, endNode };
                }
            }
        }

        return closestElement;
    }, [worldPos, nodes, edges, trains, sensors, signals]);
}
