/**
 * Switch Renderer Component
 *
 * The control for one turnout: a yellow button on the points with a wedge
 * that swings toward the route that's set. The track painter shows the
 * route itself (the route set against trains is drawn dimmer).
 */

import { useState, useEffect, useRef, memo } from 'react';
import { Group, Circle, Wedge } from 'react-konva';
import type { TrackNode, Vector2 } from '../../types';
import { POINTS_BUTTON } from '../../config/interactions';

// Visual constants
const SWITCH_NODE_COLOR = '#FFD93D';
/** How far the wedge swings toward the branch (degrees): readable, not to scale */
const SWING = 25;
const WEDGE_ANGLE = 30;

// Animation constants
const ANIMATION_DURATION = 150; // ms

export interface SwitchRendererProps {
    /** The switch node to render */
    node: TrackNode;
    /** Direction the main route leaves the points (degrees) */
    heading: number;
    /** The side the branch goes: +1 right (clockwise on screen), -1 left */
    branchSide: 1 | -1;
    /** Button radius on the layout (mm): grows when zoomed out, to stay clickable */
    radius: number;
    /** A click on the button: throws the points (with their own ripple) or uses the edit tool */
    onSwitchClick: (nodeId: string) => boolean;
    /** Callback when mouse enters switch */
    onHoverEnter: (nodeId: string, position: Vector2) => void;
    /** Callback when mouse leaves switch */
    onHoverLeave: () => void;
}

/**
 * Renders a switch node's control button and interaction handlers.
 */
export const SwitchRenderer = memo(function SwitchRenderer({
    node,
    heading,
    branchSide,
    radius,
    onSwitchClick,
    onHoverEnter,
    onHoverLeave,
}: SwitchRendererProps) {
    // The wedge swings toward the branch when the points are thrown
    const target = node.switchState === 1 ? branchSide * SWING : 0;
    const [animatedAngle, setAnimatedAngle] = useState(target);
    const angleRef = useRef(target);

    // Animate toward a new target. Only the target is a dependency: the
    // animation's own re-renders must not cancel it.
    useEffect(() => {
        const from = angleRef.current;
        if (from === target) return;
        const startTime = performance.now();
        let frame = 0;
        const animate = (currentTime: number) => {
            const progress = Math.min(Math.max((currentTime - startTime) / ANIMATION_DURATION, 0), 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            angleRef.current = from + (target - from) * eased;
            setAnimatedAngle(angleRef.current);
            if (progress < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [target]);

    // Konva draws a wedge clockwise from its rotation: centre it on the route
    const wedgeRotation = heading + animatedAngle - WEDGE_ANGLE / 2;
    const scale = radius / POINTS_BUTTON.RADIUS;

    const handleClick = () => {
        onSwitchClick(node.id);
    };

    const handleMouseEnter = () => {
        onHoverEnter(node.id, node.position);
    };

    return (
        <Group>
            {/* Switch control button (no shadow: Konva blurs shadows on a
                full-screen scratch canvas, per shape, per frame) */}
            <Circle
                x={node.position.x}
                y={node.position.y}
                radius={radius}
                fill={SWITCH_NODE_COLOR}
                stroke="#1A1A1A"
                strokeWidth={1.5 * scale}
                onClick={handleClick}
                onTap={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={onHoverLeave}
                perfectDrawEnabled={false}
            />

            {/* Direction indicator - small wedge toward the route that's set */}
            <Wedge
                x={node.position.x}
                y={node.position.y}
                radius={5 * scale}
                angle={WEDGE_ANGLE}
                rotation={wedgeRotation}
                fill="#1A1A1A"
                listening={false}
            />
        </Group>
    );
});
