import { memo } from 'react';
import { Group, Line } from 'react-konva';
import { SLEEPER, generateStraightSleepers, generateArcSleepers } from '../../../utils/trackRenderingUtils';
import { getEdgeWorldGeometry } from '../../../hooks/useEdgeGeometry';
import type { TrackEdge, TrackNode, Vector2 } from '../../../types';

interface SleeperRendererProps {
    edge: TrackEdge;
    startNode: TrackNode;
    endNode: TrackNode;
    nodes: Record<string, TrackNode>; // Needed for derived geometry
}

export const SleeperRenderer = memo(function SleeperRenderer({
    edge,
    startNode,
    endNode,
    nodes,
}: SleeperRendererProps) {
    const geometry = getEdgeWorldGeometry(edge, nodes) ?? edge.geometry;

    // Explicit typing for geometry subsets to satisfy TS
    const sleepers = geometry.type === 'straight'
        ? generateStraightSleepers(startNode.position, endNode.position, SLEEPER.SPACING)
        : generateArcSleepers(
            (geometry as { center: Vector2 }).center,
            (geometry as { radius: number }).radius,
            (geometry as { startAngle: number }).startAngle,
            (geometry as { endAngle: number }).endAngle,
            SLEEPER.SPACING
        );

    return (
        <Group>
            {sleepers.map((sleeper, index) => (
                <Line
                    key={index}
                    points={[-SLEEPER.LENGTH / 2, 0, SLEEPER.LENGTH / 2, 0]}
                    x={sleeper.x}
                    y={sleeper.y}
                    rotation={sleeper.rotation}
                    stroke={SLEEPER.COLOR}
                    strokeWidth={SLEEPER.WIDTH}
                    lineCap="butt"
                    listening={false}
                />
            ))}
        </Group>
    );
});
