/**
 * Switch Renderer Component
 *
 * The control for one turnout: a yellow button on the points with a wedge
 * that swings toward the route that's set. The track painter shows the
 * route itself (the route set against trains is drawn dimmer).
 */

import { useState, useEffect, useRef, memo } from 'react';
import { Group, Circle, Wedge } from 'react-konva';
import type { TrackNode, TrackEdge, EdgeId, Vector2 } from '../../types';
import { getSwitchEntryFacade } from '../../utils/connectTransform';

// Visual constants
const SWITCH_NODE_COLOR = '#FFD93D';
const SWITCH_NODE_RADIUS = 7;

// Animation constants
const ANIMATION_DURATION = 150; // ms

export interface SwitchRendererProps {
    /** The switch node to render */
    node: TrackNode;
    /** All edges (needed to calculate entry facade) */
    edges: Record<EdgeId, TrackEdge>;
    /** Returns true if the click toggled the switch */
    onSwitchClick: (nodeId: string) => boolean;
    /** Callback to trigger ripple effect */
    onRipple: (position: Vector2, options?: { color?: string }) => void;
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
    edges,
    onSwitchClick,
    onRipple,
    onHoverEnter,
    onHoverLeave,
}: SwitchRendererProps) {
    // Track animated state for smooth transitions
    const [animatedAngle, setAnimatedAngle] = useState(node.switchState === 1 ? 15 : 0);
    const animationRef = useRef<number | null>(null);
    const prevStateRef = useRef(node.switchState);

    // Animate when switch state changes
    useEffect(() => {
        if (prevStateRef.current !== node.switchState) {
            prevStateRef.current = node.switchState;

            const startAngle = animatedAngle;
            const targetAngle = node.switchState === 1 ? 15 : 0;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

                // Ease-out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                const newAngle = startAngle + (targetAngle - startAngle) * eased;

                setAnimatedAngle(newAngle);

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                }
            };

            animationRef.current = requestAnimationFrame(animate);

            return () => {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
            };
        }
    }, [node.switchState, animatedAngle]);

    // Derive wedge direction from entry edge facade
    const entryFacade = getSwitchEntryFacade(node, edges);
    const baseRotation = entryFacade !== null ? entryFacade + 180 : node.rotation + 180;
    const wedgeRotation = baseRotation + animatedAngle;

    const handleClick = () => {
        if (onSwitchClick(node.id)) {
            onRipple(node.position, { color: '#FFD93D' });
        }
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
                radius={SWITCH_NODE_RADIUS}
                fill={SWITCH_NODE_COLOR}
                stroke="#1A1A1A"
                strokeWidth={1.5}
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
                radius={5}
                angle={30}
                rotation={wedgeRotation}
                fill="#1A1A1A"
                listening={false}
            />
        </Group>
    );
});
