/**
 * TrainLayer - Renders all active trains in simulate mode
 *
 * V1: Locomotive silhouette shape
 * V2: Enhanced carriage shapes with lighter colors
 * V3: Headlight directional indicator
 */

import { useMemo } from 'react';
import { Circle, Group, Line, Rect, Shape } from 'react-konva';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useIsSimulating } from '../../stores/useModeStore';
import type { Train, Vector2 } from '../../types';
import {
    getCarriagePositions,
    getBounceScale,
    lightenColor,
} from '../../utils/trainGeometry';

// ===========================
// Visual Constants
// ===========================

/** Locomotive dimensions (V1: Silhouette shape) */
const LOCOMOTIVE = {
    WIDTH: 28,
    HEIGHT: 16,
    NOSE: 6,
} as const;

/** Carriage dimensions (V2: Enhanced shape) */
const CARRIAGE = {
    WIDTH: 22,
    HEIGHT: 12,
    CORNER_RADIUS: 4,
} as const;

/** Headlight dimensions (V3: Directional indicator) */
const HEADLIGHT = {
    RADIUS: 3,
    COLOR: '#FFFFCC',  // Warm white
} as const;

// ===========================
// Sub-Components
// ===========================

/** Props for LocomotiveShape component */
interface LocomotiveShapeProps {
    position: Vector2;
    rotation: number;
    color: string;
    scaleX: number;
    scaleY: number;
    crashed?: boolean;
}

/**
 * Locomotive shape component - renders a stylized train silhouette (V1)
 * with headlight indicator (V3)
 */
function LocomotiveShape({ position, rotation, color, scaleX, scaleY, crashed }: LocomotiveShapeProps) {
    const w = LOCOMOTIVE.WIDTH;
    const h = LOCOMOTIVE.HEIGHT;
    const nose = LOCOMOTIVE.NOSE;
    const headlightX = w / 2 - nose / 2;

    return (
        <Group x={position.x} y={position.y} rotation={rotation} scaleX={scaleX} scaleY={scaleY}>
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
// Train Entity Component
// ===========================

/**
 * Individual train component with multi-carriage support
 */
function TrainEntity({ train }: { train: Train }) {
    const { edges, nodes } = useTrackStore();

    // Calculate positions for all carriages
    const carriagePositions = useMemo(() => {
        return getCarriagePositions(train, edges, nodes);
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

/**
 * Train layer - renders all active trains (simulate mode only)
 */
export function TrainLayer() {
    const { trains } = useSimulationStore();
    const isSimulating = useIsSimulating();

    // Safety check - don't render if not in simulate mode
    if (!isSimulating) {
        return null;
    }

    return (
        <Group>
            {Object.values(trains).map((train: Train) => (
                <TrainEntity key={train.id} train={train} />
            ))}
        </Group>
    );
}
