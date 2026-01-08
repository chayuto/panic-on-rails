/**
 * Effects Layer
 * 
 * Renders visual effects (ripples, flashes, hover indicators) above the track layer.
 * Uses requestAnimationFrame for smooth animations.
 */

import { useMemo, useEffect, useState } from 'react';
import { Group, Circle, Ring } from 'react-konva';
import { useEffectsStore } from '../../stores/useEffectsStore';
import { getProgress, easeOutCubic, lerp, oscillate } from '../../utils/effectsUtils';

// ===========================
// Constants
// ===========================

const HOVER_GLOW_COLOR = '#00FF88';
const HOVER_GLOW_MIN_RADIUS = 12;
const HOVER_GLOW_MAX_RADIUS = 18;
const HOVER_GLOW_PERIOD = 1200; // ms

// ===========================
// Component
// ===========================

export function EffectsLayer() {
    const { ripples, flashes, hoveredSwitchPosition } = useEffectsStore();

    // Animation frame counter - triggers re-render
    const [tick, setTick] = useState(0);

    // Track if we have active effects
    const hasRipples = ripples.length > 0;
    const hasFlashes = flashes.length > 0;
    const hasActiveEffects = hoveredSwitchPosition !== null || hasRipples || hasFlashes;

    // Animation loop for hover glow and effects
    useEffect(() => {
        if (!hasActiveEffects) {
            return; // No active effects, no need to animate
        }

        let frameId: number;
        const animate = () => {
            setTick(t => t + 1);
            frameId = requestAnimationFrame(animate);
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [hasActiveEffects]);

    // Calculate hover glow based on current tick (avoids Date.now() in deps)
    const hoverGlow = useMemo(() => {
        if (!hoveredSwitchPosition) return null;

        // Use tick to derive time-based oscillation
        const time = tick * 16.67; // Approximate ms per frame at 60fps
        const radius = oscillate(time, HOVER_GLOW_PERIOD, HOVER_GLOW_MIN_RADIUS, HOVER_GLOW_MAX_RADIUS);
        const opacity = oscillate(time, HOVER_GLOW_PERIOD, 0.3, 0.6);

        return { radius, opacity };
    }, [hoveredSwitchPosition, tick]);

    return (
        <Group listening={false}>
            {/* Hover glow effect */}
            {hoveredSwitchPosition && hoverGlow && (
                <>
                    {/* Outer glow ring */}
                    <Ring
                        x={hoveredSwitchPosition.x}
                        y={hoveredSwitchPosition.y}
                        innerRadius={hoverGlow.radius - 3}
                        outerRadius={hoverGlow.radius + 3}
                        fill={HOVER_GLOW_COLOR}
                        opacity={hoverGlow.opacity * 0.5}
                    />
                    {/* Inner highlight */}
                    <Circle
                        x={hoveredSwitchPosition.x}
                        y={hoveredSwitchPosition.y}
                        radius={hoverGlow.radius * 0.6}
                        fill={HOVER_GLOW_COLOR}
                        opacity={hoverGlow.opacity * 0.3}
                    />
                </>
            )}

            {/* Ripple effects */}
            {ripples.map(ripple => {
                const progress = getProgress(ripple.startTime, ripple.duration);
                const eased = easeOutCubic(progress);
                const radius = lerp(ripple.startRadius, ripple.endRadius, eased);
                const opacity = 1 - progress;

                return (
                    <Circle
                        key={ripple.id}
                        x={ripple.position.x}
                        y={ripple.position.y}
                        radius={radius}
                        stroke={ripple.color}
                        strokeWidth={2}
                        opacity={opacity}
                    />
                );
            })}

            {/* Flash effects */}
            {flashes.map(flash => {
                const progress = getProgress(flash.startTime, flash.duration);
                const opacity = (1 - progress) * 0.8;
                const scale = 1 + progress * 0.3;

                return (
                    <Circle
                        key={flash.id}
                        x={flash.position.x}
                        y={flash.position.y}
                        radius={flash.radius * scale}
                        fill={flash.color}
                        opacity={opacity}
                    />
                );
            })}
        </Group>
    );
}
