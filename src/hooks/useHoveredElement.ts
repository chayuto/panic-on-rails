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
 * Calculate position along an edge for a given distance
 */
function getPositionOnEdge(edge: TrackEdge, distance: number): Vector2 {
    const progress = Math.max(0, Math.min(1, distance / edge.length));

    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        return {
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
        };
    } else {
        const { center, radius, startAngle, endAngle } = edge.geometry;
        const angle = startAngle + (endAngle - startAngle) * progress;
        return {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
        };
    }
}

/**
 * Calculate distance from a point to a line segment
 */
function distanceToLineSegment(point: Vector2, start: Vector2, end: Vector2): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
        return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const t = Math.max(0, Math.min(1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq
    ));

    const projX = start.x + t * dx;
    const projY = start.y + t * dy;

    return Math.hypot(point.x - projX, point.y - projY);
}

/**
 * Calculate distance from a point to an arc
 */
function distanceToArc(
    point: Vector2,
    center: Vector2,
    radius: number,
    startAngle: number,
    endAngle: number
): number {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distToCenter = Math.hypot(dx, dy);

    // Angle from center to point
    let angle = Math.atan2(dy, dx);

    // Normalize angles
    const normalizeAngle = (a: number) => {
        while (a < 0) a += 2 * Math.PI;
        while (a >= 2 * Math.PI) a -= 2 * Math.PI;
        return a;
    };

    angle = normalizeAngle(angle);
    const normStart = normalizeAngle(startAngle);
    let normEnd = normalizeAngle(endAngle);

    // Check if angle is within arc span
    let isInArc: boolean;
    if (normStart <= normEnd) {
        isInArc = angle >= normStart && angle <= normEnd;
    } else {
        isInArc = angle >= normStart || angle <= normEnd;
    }

    if (isInArc) {
        // Point projects onto the arc
        return Math.abs(distToCenter - radius);
    } else {
        // Point projects outside the arc, find closest endpoint
        const startPoint: Vector2 = {
            x: center.x + Math.cos(startAngle) * radius,
            y: center.y + Math.sin(startAngle) * radius
        };
        const endPoint: Vector2 = {
            x: center.x + Math.cos(endAngle) * radius,
            y: center.y + Math.sin(endAngle) * radius
        };

        const distToStart = Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
        const distToEnd = Math.hypot(point.x - endPoint.x, point.y - endPoint.y);

        return Math.min(distToStart, distToEnd);
    }
}

/**
 * Calculate distance from a point to an edge
 */
function distanceToEdge(point: Vector2, edge: TrackEdge): number {
    if (edge.geometry.type === 'straight') {
        return distanceToLineSegment(point, edge.geometry.start, edge.geometry.end);
    } else {
        const { center, radius, startAngle, endAngle } = edge.geometry;
        return distanceToArc(point, center, radius, startAngle, endAngle);
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
