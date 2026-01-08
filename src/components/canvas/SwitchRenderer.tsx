/**
 * Switch Renderer Component
 *
 * Renders switch (turnout) track nodes with visual feedback.
 * Extracted from TrackLayer.tsx for better separation of concerns.
 *
 * Features:
 * - Yellow circular switch indicator
 * - Directional wedge showing active branch
 * - Animated rail points that move when toggling
 * - Hover and click feedback with audio
 * - Ripple effect on toggle
 */

import { useState, useEffect, useRef } from 'react';
import { Group, Circle, Wedge, Line } from 'react-konva';
import type { TrackNode, TrackEdge, EdgeId, Vector2 } from '../../types';
import { getSwitchEntryFacade } from '../../utils/connectTransform';

// Visual constants
const SWITCH_NODE_COLOR = '#FFD93D';
const SWITCH_NODE_RADIUS = 10;
const RAIL_POINT_LENGTH = 14;
const RAIL_POINT_COLOR = '#888888';
const RAIL_POINT_ACTIVE_COLOR = '#4ECDC4';

// Animation constants
const ANIMATION_DURATION = 150; // ms

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
 * Renders a switch node with visual indicator, animated rail points, and interaction handlers.
 */
export function SwitchRenderer({
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

    // Calculate rail point positions (small lines showing diverging rails)
    const railPointOffset = SWITCH_NODE_RADIUS + 4;
    const mainAngleRad = (baseRotation * Math.PI) / 180;
    const branchAngleRad = ((baseRotation + animatedAngle) * Math.PI) / 180;

    // Main rail point (always straight ahead)
    const mainRailStart = {
        x: node.position.x + Math.cos(mainAngleRad) * railPointOffset,
        y: node.position.y + Math.sin(mainAngleRad) * railPointOffset,
    };
    const mainRailEnd = {
        x: node.position.x + Math.cos(mainAngleRad) * (railPointOffset + RAIL_POINT_LENGTH),
        y: node.position.y + Math.sin(mainAngleRad) * (railPointOffset + RAIL_POINT_LENGTH),
    };

    // Branch rail point (moves with animation)
    const branchRailStart = {
        x: node.position.x + Math.cos(branchAngleRad) * railPointOffset,
        y: node.position.y + Math.sin(branchAngleRad) * railPointOffset,
    };
    const branchRailEnd = {
        x: node.position.x + Math.cos(branchAngleRad) * (railPointOffset + RAIL_POINT_LENGTH * 0.7),
        y: node.position.y + Math.sin(branchAngleRad) * (railPointOffset + RAIL_POINT_LENGTH * 0.7),
    };

    const handleClick = () => {
        onSwitchClick(node.id);
        onRipple(node.position, { color: '#FFD93D' });
    };

    const handleMouseEnter = () => {
        onHoverEnter(node.id, node.position);
    };

    // Determine which rail is active
    const mainActive = node.switchState === 0;

    return (
        <Group>
            {/* Rail point indicators - shows which direction trains will go */}
            {/* Main rail (straight) */}
            <Line
                points={[mainRailStart.x, mainRailStart.y, mainRailEnd.x, mainRailEnd.y]}
                stroke={mainActive ? RAIL_POINT_ACTIVE_COLOR : RAIL_POINT_COLOR}
                strokeWidth={mainActive ? 3 : 2}
                lineCap="round"
                opacity={mainActive ? 1 : 0.5}
            />
            {/* Branch rail (diverging) */}
            <Line
                points={[branchRailStart.x, branchRailStart.y, branchRailEnd.x, branchRailEnd.y]}
                stroke={!mainActive ? RAIL_POINT_ACTIVE_COLOR : RAIL_POINT_COLOR}
                strokeWidth={!mainActive ? 3 : 2}
                lineCap="round"
                opacity={!mainActive ? 1 : 0.5}
            />

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
