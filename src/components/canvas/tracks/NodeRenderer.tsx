import { memo } from 'react';
import { Group, Circle, Ring } from 'react-konva';
import { NODE_KEY_COLORS, NODE_RADIUS, CONNECT_HIGHLIGHT_RADIUS } from './constants';
import type { TrackNode } from '../../../types';

interface NodeRendererProps {
    node: TrackNode;
    isSource: boolean;
    isValidTarget: boolean;
    isConnectMode: boolean;
    isOpenEndpoint: boolean;
    onClick: (nodeId: string) => void;
}

export const NodeRenderer = memo(function NodeRenderer({
    node,
    isSource,
    isValidTarget,
    isConnectMode,
    isOpenEndpoint,
    onClick,
}: NodeRendererProps) {

    // Determine fill color
    const fillColor = isSource
        ? NODE_KEY_COLORS.CONNECT_SOURCE
        : NODE_KEY_COLORS.DEFAULT;

    // Determine highlight color
    const highlightColor = isSource
        ? NODE_KEY_COLORS.CONNECT_SOURCE
        : isValidTarget
            ? NODE_KEY_COLORS.CONNECT_TARGET
            : NODE_KEY_COLORS.INVALID;

    return (
        <Group>
            {/* Connect mode highlight ring */}
            {isConnectMode && isOpenEndpoint && (
                <Ring
                    x={node.position.x}
                    y={node.position.y}
                    innerRadius={CONNECT_HIGHLIGHT_RADIUS - 3}
                    outerRadius={CONNECT_HIGHLIGHT_RADIUS}
                    fill={highlightColor}
                    opacity={isSource ? 0.9 : 0.6}
                />
            )}
            {/* Main node circle */}
            <Circle
                x={node.position.x}
                y={node.position.y}
                radius={NODE_RADIUS}
                fill={fillColor}
                stroke="#1A1A1A"
                strokeWidth={2}
                onClick={() => onClick(node.id)}
                onTap={() => onClick(node.id)}
            />
        </Group>
    );
});
