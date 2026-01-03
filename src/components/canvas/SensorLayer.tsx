/**
 * SensorLayer - Renders sensor zones on track edges
 * 
 * Sensors appear as colored rectangles overlaid on tracks.
 * Yellow when triggered, dim when inactive.
 */

import { Group, Rect, Text } from 'react-konva';
import { useLogicStore } from '../../stores/useLogicStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import type { Sensor, TrackEdge, Vector2 } from '../../types';

const SENSOR_HEIGHT = 12;
const SENSOR_COLOR_ACTIVE = '#FFD93D';
const SENSOR_COLOR_INACTIVE = '#8B8000';
const SENSOR_COLOR_SELECTED = '#00FF88';

/**
 * Calculate world position and rotation for a sensor on an edge
 */
function getSensorTransform(edge: TrackEdge, position: number): { pos: Vector2; rotation: number } {
    const progress = Math.max(0, Math.min(1, position / edge.length));

    if (edge.geometry.type === 'straight') {
        const { start, end } = edge.geometry;
        const pos = {
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
        };
        const rotation = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
        return { pos, rotation };
    } else {
        // Arc geometry
        const { center, radius, startAngle, endAngle } = edge.geometry;
        const angle = startAngle + (endAngle - startAngle) * progress;
        const pos = {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
        };
        // Tangent angle for arc
        const tangentAngle = angle + Math.PI / 2;
        const rotation = tangentAngle * (180 / Math.PI);
        return { pos, rotation };
    }
}

/**
 * Individual sensor component
 */
function SensorEntity({ sensor, isSelected }: { sensor: Sensor; isSelected?: boolean }) {
    const { edges } = useTrackStore();
    const { removeSensor } = useLogicStore();
    const { mode, wireSource, setWireSource } = useEditorStore();

    const edge = edges[sensor.edgeId];
    if (!edge) return null;

    const { pos, rotation } = getSensorTransform(edge, sensor.position);

    // Determine color based on state
    let fillColor = sensor.state === 'on' ? SENSOR_COLOR_ACTIVE : SENSOR_COLOR_INACTIVE;
    if (isSelected) fillColor = SENSOR_COLOR_SELECTED;
    // Highlight if this sensor is the wire source
    if (wireSource?.type === 'sensor' && wireSource.id === sensor.id) {
        fillColor = SENSOR_COLOR_SELECTED;
    }

    const handleClick = () => {
        if (mode === 'sensor') {
            // In sensor mode, clicking removes the sensor
            removeSensor(sensor.id);
        } else if (mode === 'wire') {
            // In wire mode, clicking selects this sensor as wire source
            setWireSource({ type: 'sensor', id: sensor.id });
        }
    };

    return (
        <Group
            x={pos.x}
            y={pos.y}
            rotation={rotation}
            onClick={handleClick}
            onTap={handleClick}
        >
            {/* Sensor zone rectangle */}
            <Rect
                x={-sensor.length / 2}
                y={-SENSOR_HEIGHT / 2}
                width={sensor.length}
                height={SENSOR_HEIGHT}
                fill={fillColor}
                stroke={sensor.state === 'on' ? '#FFF' : '#444'}
                strokeWidth={1}
                cornerRadius={3}
                opacity={sensor.state === 'on' ? 0.9 : 0.6}
                shadowColor={sensor.state === 'on' ? '#FFD93D' : 'transparent'}
                shadowBlur={sensor.state === 'on' ? 10 : 0}
            />
            {/* Sensor label (only in sensor mode) */}
            {mode === 'sensor' && (
                <Text
                    x={-sensor.length / 2}
                    y={-SENSOR_HEIGHT / 2 - 14}
                    text="📡"
                    fontSize={10}
                />
            )}
        </Group>
    );
}

/**
 * SensorLayer - Renders all sensors
 */
export function SensorLayer() {
    const { sensors } = useLogicStore();

    return (
        <Group>
            {Object.values(sensors).map((sensor) => (
                <SensorEntity key={sensor.id} sensor={sensor} />
            ))}
        </Group>
    );
}
