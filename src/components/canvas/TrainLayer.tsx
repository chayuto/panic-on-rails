/**
 * TrainLayer - Renders all active trains in simulate mode
 *
 * V1: Locomotive silhouette shape
 * V2: Enhanced carriage shapes with lighter colors
 * V3: Headlight directional indicator
 * V7: Motion trail effect behind fast trains
 * V8: Headlight cone projecting forward
 */

import { useMemo } from 'react';
import { Circle, Group, Line, Rect, Shape, Wedge } from 'react-konva';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useIsSimulating } from '../../stores/useModeStore';
import type { Train, Vector2, EdgeId, NodeId, TrackEdge, TrackNode, BoundingBox } from '../../types';

import {
    getCarriagePositions,
    getBounceScale,
    lightenColor,
    getPositionOnEdge,
} from '../../utils/trainGeometry';

import { RENDERING } from '../../config/rendering';

// ===========================
// Visual Constants
// ===========================

const { LOCOMOTIVE, CARRIAGE, HEADLIGHT, TRAIL, CONE } = RENDERING;


// ===========================
// Sub-Components
// ===========================

/**
 * Headlight cone component (V8) - projects light forward from locomotive
 */
interface HeadlightConeProps {
    x: number;
    y: number;
    rotation: number;
}

function HeadlightCone({ x, y, rotation }: HeadlightConeProps) {
    return (
        <Wedge
            x={x}
            y={y}
            radius={CONE.LENGTH}
            angle={CONE.ANGLE}
            rotation={rotation - CONE.ANGLE / 2}  // Center the cone
            fill={CONE.COLOR}
            opacity={CONE.OPACITY}
            listening={false}
        />
    );
}

/** Props for LocomotiveShape component */
interface LocomotiveShapeProps {
    position: Vector2;
    rotation: number;
    color: string;
    scaleX: number;
    scaleY: number;
    crashed?: boolean;
    showCone?: boolean;  // V8: Show headlight cone
}

/**
 * Locomotive shape component - renders a stylized train silhouette (V1)
 * with headlight indicator (V3) and headlight cone (V8)
 */
function LocomotiveShape({ position, rotation, color, scaleX, scaleY, crashed, showCone }: LocomotiveShapeProps) {
    const w = LOCOMOTIVE.WIDTH;
    const h = LOCOMOTIVE.HEIGHT;
    const nose = LOCOMOTIVE.NOSE;
    const headlightX = w / 2 - nose / 2;

    return (
        <Group x={position.x} y={position.y} rotation={rotation} scaleX={scaleX} scaleY={scaleY}>
            {/* Headlight cone - renders behind locomotive (V8) */}
            {showCone && !crashed && (
                <HeadlightCone
                    x={w / 2}
                    y={0}
                    rotation={0}  // Already rotated by parent group
                />
            )}
            {/* Locomotive body - tapered rectangle shape */}
            <Shape
                sceneFunc={(context, shape) => {
                    context.beginPath();
                    // Start at back-left
                    context.moveTo(-w / 2, -h / 2);
                    // Top edge to taper start
                    context.lineTo(w / 2 - nose, -h / 2);
                    // Taper to front point
                    context.lineTo(w / 2, 0);
                    // Taper to bottom
                    context.lineTo(w / 2 - nose, h / 2);
                    // Bottom edge
                    context.lineTo(-w / 2, h / 2);
                    // Close path
                    context.closePath();
                    context.fillStrokeShape(shape);
                }}
                fill={crashed ? '#444444' : color}
                stroke={crashed ? '#FF0000' : '#FFFFFF'}
                strokeWidth={crashed ? 3 : 2}
                shadowColor={crashed ? 'red' : 'black'}
                shadowBlur={crashed ? 10 : 5}
                shadowOpacity={crashed ? 0.5 : 0.3}
            />
            {/* Headlight - only shown when not crashed (V3) */}
            {!crashed && (
                <Circle
                    x={headlightX}
                    y={0}
                    radius={HEADLIGHT.RADIUS}
                    fill={HEADLIGHT.COLOR}
                    shadowColor={HEADLIGHT.COLOR}
                    shadowBlur={4}
                    shadowOpacity={0.5}
                />
            )}
        </Group>
    );
}

/** Props for CarriageShape component */
interface CarriageShapeProps {
    position: Vector2;
    rotation: number;
    color: string;
    crashed?: boolean;
}

/**
 * Carriage shape component - renders a rounded rectangle (V2)
 */
function CarriageShape({ position, rotation, color, crashed }: CarriageShapeProps) {
    return (
        <Group x={position.x} y={position.y} rotation={rotation}>
            <Rect
                x={-CARRIAGE.WIDTH / 2}
                y={-CARRIAGE.HEIGHT / 2}
                width={CARRIAGE.WIDTH}
                height={CARRIAGE.HEIGHT}
                fill={crashed ? '#444444' : color}
                stroke={crashed ? '#FF0000' : '#FFFFFF'}
                strokeWidth={crashed ? 2 : 1.5}
                cornerRadius={CARRIAGE.CORNER_RADIUS}
                shadowColor="black"
                shadowBlur={3}
                shadowOpacity={0.2}
            />
        </Group>
    );
}

/** Props for CrashMarker component */
interface CrashMarkerProps {
    position: Vector2;
}

/**
 * Crash marker component - renders red X symbol
 */
function CrashMarker({ position }: CrashMarkerProps) {
    return (
        <>
            <Line
                points={[
                    position.x - 6, position.y - 6,
                    position.x + 6, position.y + 6,
                ]}
                stroke="#FF0000"
                strokeWidth={3}
                lineCap="round"
            />
            <Line
                points={[
                    position.x + 6, position.y - 6,
                    position.x - 6, position.y + 6,
                ]}
                stroke="#FF0000"
                strokeWidth={3}
                lineCap="round"
            />
        </>
    );
}

// ===========================
// Trail Effect (V7)
// ===========================

/**
 * Calculate trail positions behind the train by tracing back along track
 * Uses the same logic as carriage positioning but with different spacing
 */
function getTrailPositions(
    train: Train,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>,
    segmentCount: number
): Vector2[] {
    // No trail if crashed or too slow
    if (train.crashed || train.speed < TRAIL.MIN_SPEED) return [];

    // Calculate number of segments based on speed
    const speedFactor = Math.min(1, (train.speed - TRAIL.MIN_SPEED) / 150);
    const actualCount = Math.ceil(segmentCount * speedFactor);
    if (actualCount === 0) return [];

    const positions: Vector2[] = [];
    const currentEdgeId = train.currentEdgeId;
    const currentDistance = train.distanceAlongEdge;
    const currentDirection = train.direction;

    // Start from locomotive position and trace backward
    for (let i = 1; i <= actualCount; i++) {
        // Move backwards along track
        let remainingDistance = TRAIL.SEGMENT_SPACING * i;
        let tempEdgeId = currentEdgeId;
        let tempDistance = currentDistance;
        let tempDirection = currentDirection;

        // Maximum iterations to prevent infinite loops
        const MAX_ITERATIONS = 20;
        let iterations = 0;

        while (remainingDistance > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            const edge = edges[tempEdgeId];
            if (!edge) break;

            // Calculate distance available on current edge in backward direction
            let availableDistance: number;
            if (tempDirection === 1) {
                availableDistance = tempDistance;
            } else {
                availableDistance = edge.length - tempDistance;
            }

            if (availableDistance >= remainingDistance) {
                // Enough room on current edge
                if (tempDirection === 1) {
                    tempDistance -= remainingDistance;
                } else {
                    tempDistance += remainingDistance;
                }
                remainingDistance = 0;
            } else {
                // Need to transition to previous edge
                remainingDistance -= availableDistance;
                const entryNodeId = tempDirection === 1 ? edge.startNodeId : edge.endNodeId;
                const entryNode = nodes[entryNodeId];
                if (!entryNode) break;

                const otherConnections = entryNode.connections.filter(id => id !== tempEdgeId);
                if (otherConnections.length === 0) break;

                const prevEdgeId = otherConnections[0];
                const prevEdge = edges[prevEdgeId];
                if (!prevEdge) break;

                tempEdgeId = prevEdgeId;
                if (prevEdge.endNodeId === entryNodeId) {
                    tempDistance = prevEdge.length;
                    tempDirection = 1;
                } else {
                    tempDistance = 0;
                    tempDirection = -1;
                }
            }
        }

        // Get position on the edge
        const edge = edges[tempEdgeId];
        if (edge) {
            const pos = getPositionOnEdge(edge, tempDistance, nodes);
            positions.push(pos);
        }
    }

    return positions;
}

/** Props for TrailEffect component */
interface TrailEffectProps {
    train: Train;
    positions: Vector2[];
}

/**
 * Trail effect component (V7) - renders fading circles behind fast trains
 */
function TrailEffect({ train, positions }: TrailEffectProps) {
    if (positions.length === 0) return null;

    return (
        <Group>
            {positions.map((pos, index) => {
                // Opacity decreases with distance
                const opacity = TRAIL.BASE_OPACITY * (1 - index / positions.length);
                // Size decreases with distance
                const radius = TRAIL.SEGMENT_RADIUS * (1 - index / positions.length * 0.5);

                return (
                    <Circle
                        key={index}
                        x={pos.x}
                        y={pos.y}
                        radius={radius}
                        fill={train.color}
                        opacity={opacity}
                        listening={false}
                    />
                );
            })}
        </Group>
    );
}

// ===========================
// Train Entity Component
// ===========================

/**
 * Individual train component with multi-carriage support
 * V7: Motion trail effect behind fast trains
 * V8: Headlight cone projecting forward
 */
function TrainEntity({ train }: { train: Train }) {
    const { edges, nodes } = useTrackStore();

    // Calculate positions for all carriages
    const carriagePositions = useMemo(() => {
        return getCarriagePositions(train, edges, nodes);
    }, [train, edges, nodes]);

    // Calculate trail positions (V7)
    const trailPositions = useMemo(() => {
        return getTrailPositions(train, edges, nodes, TRAIL.SEGMENT_COUNT);
    }, [train, edges, nodes]);

    // Calculate bounce animation scale (only applies to locomotive)
    const { scaleX, scaleY } = getBounceScale(train.bounceTime);

    // Render nothing if no valid positions
    if (carriagePositions.length === 0) return null;

    // Crashed train rendering
    if (train.crashed) {
        const locoPos = carriagePositions[0];
        return (
            <Group>
                {/* Render all carriages as crashed */}
                {carriagePositions.map((carriage, index) => (
                    <Group key={index}>
                        {index === 0 ? (
                            <LocomotiveShape
                                position={carriage.position}
                                rotation={carriage.rotation}
                                color={train.color}
                                scaleX={1}
                                scaleY={1}
                                crashed={true}
                            />
                        ) : (
                            <CarriageShape
                                position={carriage.position}
                                rotation={carriage.rotation}
                                color={train.color}
                                crashed={true}
                            />
                        )}
                    </Group>
                ))}
                {/* X symbol on crashed locomotive */}
                <CrashMarker position={locoPos.position} />
            </Group>
        );
    }

    // Normal train rendering with multiple carriages
    return (
        <Group>
            {/* Motion trail effect (V7) - renders behind train */}
            <TrailEffect train={train} positions={trailPositions} />

            {carriagePositions.map((carriage, index) => {
                if (index === 0) {
                    // Locomotive (first car)
                    return (
                        <LocomotiveShape
                            key={index}
                            position={carriage.position}
                            rotation={carriage.rotation}
                            color={train.color}
                            scaleX={scaleX}
                            scaleY={scaleY}
                            showCone={true}  // V8: Headlight cone
                        />
                    );
                } else {
                    // Carriage - use slightly lighter color
                    const carriageColor = lightenColor(train.color, 20);
                    return (
                        <CarriageShape
                            key={index}
                            position={carriage.position}
                            rotation={carriage.rotation}
                            color={carriageColor}
                        />
                    );
                }
            })}
        </Group>
    );
}

// ===========================
// Main TrainLayer Component
// ===========================


export interface TrainLayerProps {
    viewport: BoundingBox | null;
}

/**
 * Train layer - renders all active trains (simulate mode only)
 */
export function TrainLayer({ viewport }: TrainLayerProps) {
    const { trains } = useSimulationStore();
    const { edges, nodes } = useTrackStore();
    const isSimulating = useIsSimulating();

    // Safety check - don't render if not in simulate mode
    if (!isSimulating) {
        return null;
    }

    // R14: Viewport culling for trains
    // Trains are dynamic, so we check inclusion every frame (render)
    // We add a generous margin (200px) to prevent pop-in
    const MARGIN = 200;

    return (
        <Group>
            {Object.values(trains).map((train: Train) => {
                // If viewport is active, check if train is visible
                if (viewport) {
                    const edge = edges[train.currentEdgeId];
                    // Skip if edge not found (data consistency issue)
                    if (!edge) return null;

                    // Calculate locomotive position for culling check
                    // We only check the locomotive position to save performance
                    // compared to calculating all carriages.
                    const position = getPositionOnEdge(edge, train.distanceAlongEdge, nodes);

                    const isVisible =
                        position.x >= viewport.x - MARGIN &&
                        position.x <= viewport.x + viewport.width + MARGIN &&
                        position.y >= viewport.y - MARGIN &&
                        position.y <= viewport.y + viewport.height + MARGIN;

                    if (!isVisible) return null;
                }

                return <TrainEntity key={train.id} train={train} />;
            })}
        </Group>
    );
}
