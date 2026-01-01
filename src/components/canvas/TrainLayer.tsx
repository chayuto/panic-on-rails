import { useMemo } from 'react';
import { Circle, Group } from 'react-konva';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import type { Train, TrackEdge, Vector2 } from '../../types';

const TRAIN_RADIUS = 12;

/**
 * Calculate world position from edge geometry and distance along edge
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
 * Individual train component
 */
function TrainEntity({ train }: { train: Train }) {
    const { edges } = useTrackStore();

    // Calculate position - memoize to avoid recalc on every render
    const position = useMemo(() => {
        const edge = edges[train.currentEdgeId];
        if (!edge) return null;
        return getPositionOnEdge(edge, train.distanceAlongEdge);
    }, [edges, train.currentEdgeId, train.distanceAlongEdge]);

    // Render nothing if no valid position
    if (!position) return null;

    return (
        <Circle
            x={position.x}
            y={position.y}
            radius={TRAIN_RADIUS}
            fill={train.color}
            stroke="#FFFFFF"
            strokeWidth={2}
            shadowColor="black"
            shadowBlur={5}
            shadowOpacity={0.3}
        />
    );
}

/**
 * Train layer - renders all active trains
 */
export function TrainLayer() {
    const { trains } = useSimulationStore();

    return (
        <Group>
            {Object.values(trains).map((train: Train) => (
                <TrainEntity key={train.id} train={train} />
            ))}
        </Group>
    );
}
