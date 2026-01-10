import { memo } from 'react';
import { Group, Line, Arc } from 'react-konva';
import type Konva from 'konva';
import { RAIL, getParallelLinePoints, getDualArcRadii } from '../../../utils/trackRenderingUtils';
import { getEdgeWorldGeometry } from '../../../hooks/useEdgeGeometry';
import { RAIL_COLORS, HIT_STROKE_WIDTH } from './constants';
import type { TrackEdge, TrackNode, Vector2 } from '../../../types';

interface TrackRendererProps {
    edge: TrackEdge;
    startNode: TrackNode;
    endNode: TrackNode;
    nodes: Record<string, TrackNode>; // Needed for derived geometry
    isSelected: boolean;
    isSwitchActive: boolean | null; // null if not switch, true/false if switch active/inactive
    onClick: (edgeId: string, e: Konva.KonvaEventObject<Event>) => void;
}

export const TrackRenderer = memo(function TrackRenderer({
    edge,
    startNode,
    endNode,
    nodes,
    isSelected,
    isSwitchActive,
    onClick,
}: TrackRendererProps) {
    const geometry = getEdgeWorldGeometry(edge, nodes) ?? edge.geometry;

    // Determine color
    let color = RAIL_COLORS.DEFAULT;
    if (isSelected) {
        color = RAIL_COLORS.SELECTED;
    } else if (isSwitchActive === false) {
        color = RAIL_COLORS.INACTIVE;
    }

    const railStroke = isSelected ? RAIL.WIDTH + 1 : RAIL.WIDTH;

    if (geometry.type === 'straight') {
        const halfGauge = RAIL.GAUGE / 2;
        const rail1Points = getParallelLinePoints(startNode.position, endNode.position, -halfGauge);
        const rail2Points = getParallelLinePoints(startNode.position, endNode.position, halfGauge);

        return (
            <Group>
                {/* Rail 1 */}
                <Line
                    points={rail1Points}
                    stroke={color}
                    strokeWidth={railStroke}
                    lineCap="round"
                    listening={false}
                />
                {/* Rail 2 */}
                <Line
                    points={rail2Points}
                    stroke={color}
                    strokeWidth={railStroke}
                    lineCap="round"
                    listening={false}
                />
                {/* Hit Area */}
                <Line
                    points={[startNode.position.x, startNode.position.y, endNode.position.x, endNode.position.y]}
                    stroke="transparent"
                    strokeWidth={0}
                    hitStrokeWidth={HIT_STROKE_WIDTH}
                    onClick={(e) => onClick(edge.id, e)}
                    onTap={(e) => onClick(edge.id, e)}
                />
            </Group>
        );
    } else {
        // Arc Geometry
        if (geometry.type !== 'arc') return null; // Safety

        const { center, radius, startAngle, endAngle } = geometry as { center: Vector2; radius: number; startAngle: number; endAngle: number };
        const sweepDeg = endAngle - startAngle;
        const { inner, outer } = getDualArcRadii(radius, RAIL.GAUGE);

        return (
            <Group>
                {/* Inner Rail */}
                <Arc
                    x={center.x}
                    y={center.y}
                    innerRadius={inner - railStroke / 2}
                    outerRadius={inner + railStroke / 2}
                    angle={sweepDeg}
                    rotation={startAngle}
                    fill={color}
                    listening={false}
                />
                {/* Outer Rail */}
                <Arc
                    x={center.x}
                    y={center.y}
                    innerRadius={outer - railStroke / 2}
                    outerRadius={outer + railStroke / 2}
                    angle={sweepDeg}
                    rotation={startAngle}
                    fill={color}
                    listening={false}
                />
                {/* Hit Area */}
                <Arc
                    x={center.x}
                    y={center.y}
                    innerRadius={inner - RAIL.GAUGE / 2}
                    outerRadius={outer + RAIL.GAUGE / 2}
                    angle={sweepDeg}
                    rotation={startAngle}
                    fill="transparent"
                    onClick={(e) => onClick(edge.id, e)}
                    onTap={(e) => onClick(edge.id, e)}
                />
            </Group>
        );
    }
});
