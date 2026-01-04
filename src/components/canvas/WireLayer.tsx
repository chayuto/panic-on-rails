/**
 * WireLayer - Renders wire connections between logic components
 * 
 * Wires appear as bezier curves connecting sensors/signals to switches/signals.
 */

import { Group, Line } from 'react-konva';
import { useLogicStore } from '../../stores/useLogicStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useModeStore } from '../../stores/useModeStore';
import type { Wire, Sensor, Signal, Vector2, TrackEdge } from '../../types';

const WIRE_COLOR_ACTIVE = '#FFD93D';
const WIRE_COLOR_INACTIVE = '#666';
const WIRE_WIDTH = 2;

/**
 * Get position for a sensor (center of sensor zone)
 */
function getSensorPosition(sensor: Sensor, edges: Record<string, TrackEdge>): Vector2 | null {
    const edge = edges[sensor.edgeId];
    if (!edge) return null;

    const progress = Math.max(0, Math.min(1, sensor.position / edge.length));

    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        return {
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
        };
    } else {
        // Arc geometry - angles are stored in DEGREES per constitution
        const { center, radius, startAngle, endAngle } = edge.geometry;
        const angleDeg = startAngle + (endAngle - startAngle) * progress;
        const angleRad = (angleDeg * Math.PI) / 180;
        return {
            x: center.x + Math.cos(angleRad) * radius,
            y: center.y + Math.sin(angleRad) * radius,
        };
    }
}

/**
 * Get position for a signal
 */
function getSignalPosition(signal: Signal, nodes: Record<string, { position: Vector2 }>): Vector2 | null {
    const node = nodes[signal.nodeId];
    if (!node) return null;
    return {
        x: node.position.x + signal.offset.x,
        y: node.position.y + signal.offset.y,
    };
}

/**
 * Get source position for a wire
 */
function getSourcePosition(
    wire: Wire,
    sensors: Record<string, Sensor>,
    signals: Record<string, Signal>,
    edges: Record<string, TrackEdge>,
    nodes: Record<string, { position: Vector2 }>
): Vector2 | null {
    if (wire.sourceType === 'sensor') {
        const sensor = sensors[wire.sourceId];
        if (!sensor) return null;
        return getSensorPosition(sensor, edges);
    } else {
        const signal = signals[wire.sourceId];
        if (!signal) return null;
        return getSignalPosition(signal, nodes);
    }
}

/**
 * Get target position for a wire
 */
function getTargetPosition(
    wire: Wire,
    signals: Record<string, Signal>,
    nodes: Record<string, { position: Vector2 }>
): Vector2 | null {
    if (wire.targetType === 'switch') {
        const node = nodes[wire.targetId];
        if (!node) return null;
        return node.position;
    } else {
        const signal = signals[wire.targetId];
        if (!signal) return null;
        return getSignalPosition(signal, nodes);
    }
}

/**
 * Individual wire component
 */
function WireEntity({ wire }: { wire: Wire }) {
    const { sensors, signals, removeWire } = useLogicStore();
    const { edges, nodes } = useTrackStore();
    const { editSubMode } = useModeStore();

    const sourcePos = getSourcePosition(wire, sensors, signals, edges, nodes);
    const targetPos = getTargetPosition(wire, signals, nodes);

    if (!sourcePos || !targetPos) return null;

    // Calculate bezier control points for a nice curve
    const midX = (sourcePos.x + targetPos.x) / 2;
    const midY = (sourcePos.y + targetPos.y) / 2;
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;

    // Control point perpendicular to line
    const ctrl1 = { x: midX - dy * 0.3, y: midY + dx * 0.3 };

    // Check if source is active
    let isActive = false;
    if (wire.sourceType === 'sensor') {
        const sensor = sensors[wire.sourceId];
        isActive = sensor?.state === 'on';
    } else {
        const signal = signals[wire.sourceId];
        isActive = signal?.state === 'green';
    }

    const color = isActive ? WIRE_COLOR_ACTIVE : WIRE_COLOR_INACTIVE;

    const handleClick = () => {
        // Only allow wire removal in wire mode
        if (editSubMode === 'wire') {
            removeWire(wire.id);
        }
    };

    // Create points for a quadratic bezier approximation
    const points: number[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Quadratic bezier: (1-t)²P0 + 2(1-t)tP1 + t²P2
        const x = (1 - t) * (1 - t) * sourcePos.x + 2 * (1 - t) * t * ctrl1.x + t * t * targetPos.x;
        const y = (1 - t) * (1 - t) * sourcePos.y + 2 * (1 - t) * t * ctrl1.y + t * t * targetPos.y;
        points.push(x, y);
    }

    return (
        <Line
            points={points}
            stroke={color}
            strokeWidth={WIRE_WIDTH}
            lineCap="round"
            dash={isActive ? undefined : [5, 5]}
            opacity={isActive ? 1 : 0.5}
            onClick={handleClick}
            onTap={handleClick}
            hitStrokeWidth={10}
        />
    );
}

/**
 * WireLayer - Renders all wires
 */
export function WireLayer() {
    const { wires } = useLogicStore();
    const { primaryMode, editSubMode } = useModeStore();

    // Show wires in wire mode, select mode, or simulate mode
    const showWires = editSubMode === 'wire' || editSubMode === 'select' || primaryMode === 'simulate';
    if (!showWires) return null;

    return (
        <Group>
            {Object.values(wires).map((wire) => (
                <WireEntity key={wire.id} wire={wire} />
            ))}
        </Group>
    );
}
