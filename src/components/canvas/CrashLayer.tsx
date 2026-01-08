/**
 * Crash Layer
 * 
 * Renders crashed train parts with physics-based animation.
 * Creates spectacular "Lego-style" debris from train collisions.
 */

import { useMemo } from 'react';
import { Group, Rect, Circle } from 'react-konva';
import { useSimulationStore } from '../../stores/useSimulationStore';
import type { CrashedPart, CrashPartType } from '../../utils/crashPhysics';

// ===========================
// Part Dimensions
// ===========================

const PART_DIMENSIONS: Record<CrashPartType, { width: number; height: number }> = {
    body: { width: 24, height: 12 },
    wheel: { width: 6, height: 6 },
    chimney: { width: 5, height: 8 },
    cab: { width: 10, height: 10 },
    cargo: { width: 16, height: 10 },
};

// ===========================
// Component
// ===========================

export function CrashLayer() {
    const crashedParts = useSimulationStore(state => state.crashedParts);

    // Memoize to avoid re-renders when parts don't change
    const partElements = useMemo(() => {
        return crashedParts.map(part => (
            <CrashPartRenderer key={part.id} part={part} />
        ));
    }, [crashedParts]);

    if (crashedParts.length === 0) {
        return null;
    }

    return (
        <Group listening={false}>
            {partElements}
        </Group>
    );
}

// ===========================
// Part Renderer
// ===========================

interface CrashPartRendererProps {
    part: CrashedPart;
}

function CrashPartRenderer({ part }: CrashPartRendererProps) {
    const dim = PART_DIMENSIONS[part.type];
    const rotationDeg = (part.rotation * 180) / Math.PI;

    // Fade out settled parts
    const opacity = part.settled ? 0.6 : 1.0;

    // Render different shapes based on part type
    if (part.type === 'wheel') {
        return (
            <Circle
                x={part.position.x}
                y={part.position.y}
                radius={dim.width / 2}
                fill={part.color}
                stroke="#222"
                strokeWidth={1}
                rotation={rotationDeg}
                opacity={opacity}
            />
        );
    }

    // All other parts are rectangles
    return (
        <Rect
            x={part.position.x}
            y={part.position.y}
            width={dim.width}
            height={dim.height}
            offsetX={dim.width / 2}
            offsetY={dim.height / 2}
            fill={part.color}
            stroke="#222"
            strokeWidth={1}
            rotation={rotationDeg}
            cornerRadius={part.type === 'cab' ? 2 : 1}
            opacity={opacity}
        />
    );
}
