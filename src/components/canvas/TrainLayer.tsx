import { useMemo } from 'react';
import { Circle, Group, Line } from 'react-konva';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import type { Train, TrackEdge, Vector2 } from '../../types';

const TRAIN_RADIUS = 12;
const BOUNCE_DURATION = 300; // ms

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
 * Calculate bounce animation scale using easeOutElastic
 */
function getBounceScale(bounceTime: number | undefined): { scaleX: number; scaleY: number } {
    if (!bounceTime) return { scaleX: 1, scaleY: 1 };

    const elapsed = performance.now() - bounceTime;
    if (elapsed > BOUNCE_DURATION) return { scaleX: 1, scaleY: 1 };

    // Normalize progress 0 to 1
    const t = elapsed / BOUNCE_DURATION;

    // EaseOutElastic for bouncy feel
    const c4 = (2 * Math.PI) / 3;
    const elasticValue = t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;

    // Squash: at t=0, scaleX=1.3, scaleY=0.7
    // Stretch back with elastic overshoot
    const squash = 0.3 * (1 - elasticValue);
    const scaleX = 1 + squash;
    const scaleY = 1 - squash;

    return { scaleX, scaleY };
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

    // Calculate bounce animation scale
    const { scaleX, scaleY } = getBounceScale(train.bounceTime);

    // Render nothing if no valid position
    if (!position) return null;

    // Crashed train rendering
    if (train.crashed) {
        return (
            <Group>
                {/* Crashed train - dark gray with red stroke */}
                <Circle
                    x={position.x}
                    y={position.y}
                    radius={TRAIN_RADIUS}
                    fill="#444444"
                    stroke="#FF0000"
                    strokeWidth={3}
                    shadowColor="red"
                    shadowBlur={10}
                    shadowOpacity={0.5}
                />
                {/* X symbol on crashed train */}
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
            </Group>
        );
    }

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
            scaleX={scaleX}
            scaleY={scaleY}
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
