/**
 * Switch Renderer Component
 *
 * Renders switch (turnout) track nodes with visual feedback.
 * Extracted from TrackLayer.tsx for better separation of concerns.
 *
 * Features:
 * - Yellow circular switch indicator
 * - Directional wedge showing active branch
 * - Hover and click feedback with audio
 * - Ripple effect on toggle
 */

import { Group, Circle, Wedge } from 'react-konva';
import type { TrackNode, TrackEdge, EdgeId, Vector2 } from '../../types';
import { getSwitchEntryFacade } from '../../utils/connectTransform';

// Visual constants
const SWITCH_NODE_COLOR = '#FFD93D';
const SWITCH_NODE_RADIUS = 10;

export interface SwitchRendererProps {
    /** The switch node to render */
    node: TrackNode;
    /** All edges (needed to calculate entry facade) */
    edges: Record<EdgeId, TrackEdge>;
    /** Callback when switch is clicked */
    onSwitchClick: (nodeId: string) => void;
    /** Callback to trigger ripple effect */
    onRipple: (position: Vector2, options?: { color?: string }) => void;
    /** Callback when mouse enters switch */
    onHoverEnter: (nodeId: string, position: Vector2) => void;
    /** Callback when mouse leaves switch */
    onHoverLeave: () => void;
}

/**
 * Renders a switch node with visual indicator and interaction handlers.
 */
export function SwitchRenderer({
    node,
    edges,
    onSwitchClick,
    onRipple,
    onHoverEnter,
    onHoverLeave,
}: SwitchRendererProps) {
    // Derive wedge direction from entry edge facade
    // Entry facade points INTO the switch, wedge points OUT (opposite)
    // Add branch offset when branch is active
    const entryFacade = getSwitchEntryFacade(node, edges);
    const wedgeRotation = entryFacade !== null
        ? entryFacade + 180 + (node.switchState === 1 ? 15 : 0)
        : node.rotation + 180 + (node.switchState === 1 ? 15 : 0); // Fallback

    const handleClick = () => {
        onSwitchClick(node.id);
        onRipple(node.position, { color: '#FFD93D' });
    };

    const handleMouseEnter = () => {
        onHoverEnter(node.id, node.position);
    };

    return (
        <Group>
            {/* Switch indicator - larger clickable circle */}
            <Circle
                x={node.position.x}
                y={node.position.y}
                radius={SWITCH_NODE_RADIUS}
                fill={SWITCH_NODE_COLOR}
                stroke="#1A1A1A"
                strokeWidth={2}
                onClick={handleClick}
                onTap={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={onHoverLeave}
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={0.3}
            />
            {/* Direction indicator - small wedge showing active branch */}
            <Wedge
                x={node.position.x}
                y={node.position.y}
                radius={6}
                angle={30}
                rotation={wedgeRotation}
                fill="#1A1A1A"
            />
        </Group>
    );
}
