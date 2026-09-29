import { useState, useEffect, useRef, useMemo } from 'react';
import { Line, Circle, Group } from 'react-konva';
import { useEditorStore, type GhostState } from '../../stores/useEditorStore';
import { useIsEditing } from '../../stores/useModeStore';
import { getPartById } from '../../data/catalog';
import { createPartTrack } from '../../stores/slices/trackCreators';
import { getWorldConnectors } from '../../utils/snapManager';
import type { TrackGeometry } from '../../types';

const GHOST_VALID_COLOR = '#4ECDC4';   // Teal
const GHOST_INVALID_COLOR = '#FF6B6B'; // Red
const GHOST_OPACITY = 0.5;
/** Arc sampling step for the preview polyline (degrees). */
const ARC_STEP_DEG = 3;

/** Flat [x0, y0, x1, y1, …] points along an edge, for a Konva Line. */
function edgePoints(g: TrackGeometry): number[] {
    if (g.type === 'straight') return [g.start.x, g.start.y, g.end.x, g.end.y];
    const sweep = g.endAngle - g.startAngle;
    const steps = Math.max(2, Math.ceil(Math.abs(sweep) / ARC_STEP_DEG));
    const points: number[] = [];
    for (let i = 0; i <= steps; i++) {
        const a = ((g.startAngle + (sweep * i) / steps) * Math.PI) / 180;
        points.push(g.center.x + g.radius * Math.cos(a), g.center.y + g.radius * Math.sin(a));
    }
    return points;
}

/**
 * Renders a semi-transparent preview of the part being dragged (edit mode only).
 *
 * The preview is built by the same `createPartTrack()` that places the part,
 * so every part type — turnouts, crossings, crossovers, bumpers — previews
 * exactly as it will land.
 */
export function GhostLayer() {
    const isEditing = useIsEditing();
    const draggedPartId = useEditorStore(state => state.draggedPartId);
    const snapTarget = useEditorStore(state => state.snapTarget);

    // Local state for high-frequency updates
    const [ghostState, setGhostState] = useState(useEditorStore.getState().getGhostTransient());
    const lastGhostRef = useRef<GhostState | null>(null);

    useEffect(() => {
        if (!draggedPartId) return;

        let animationFrameId: number;

        const loop = () => {
            const current = useEditorStore.getState().getGhostTransient();
            if (current) {
                const last = lastGhostRef.current;
                // Only update state if position or rotation actually changed
                if (
                    !last ||
                    last.position.x !== current.position.x ||
                    last.position.y !== current.position.y ||
                    last.rotation !== current.rotation ||
                    last.valid !== current.valid
                ) {
                    lastGhostRef.current = current;
                    setGhostState({ ...current });
                }
            }
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [draggedPartId]);

    const part = draggedPartId ? getPartById(draggedPartId) : undefined;
    const position = ghostState?.position;
    const rotation = ghostState?.rotation ?? 0;
    const x = position?.x;
    const y = position?.y;

    const preview = useMemo(() => {
        if (!part || x === undefined || y === undefined) return null;
        const at = { x, y };
        return {
            lines: createPartTrack(part, at, rotation).edges.map(e => edgePoints(e.geometry)),
            connectors: getWorldConnectors(part, at, rotation).map(c => c.worldPosition),
        };
    }, [part, x, y, rotation]);

    // Don't render in simulate mode, or without a part under the cursor
    if (!isEditing || !preview) return null;

    const color = ghostState?.valid === false ? GHOST_INVALID_COLOR : GHOST_VALID_COLOR;

    return (
        <Group listening={false}>
            {preview.lines.map((points, i) => (
                <Line
                    key={i}
                    points={points}
                    stroke={color}
                    strokeWidth={6}
                    lineCap="round"
                    lineJoin="round"
                    opacity={GHOST_OPACITY}
                />
            ))}

            {/* Connector points: where this part can join the layout */}
            {preview.connectors.map((c, i) => (
                <Circle key={`c${i}`} x={c.x} y={c.y} radius={6} fill={color} opacity={GHOST_OPACITY} />
            ))}

            {/* Snap indicator (green ring) */}
            {snapTarget && (
                <Circle
                    x={snapTarget.targetPosition.x}
                    y={snapTarget.targetPosition.y}
                    radius={15}
                    stroke="#00FF88"
                    strokeWidth={3}
                    fill="transparent"
                    opacity={0.8}
                />
            )}
        </Group>
    );
}
