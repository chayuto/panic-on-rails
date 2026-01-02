import { Line, Arc, Circle, Group } from 'react-konva';
import { useEditorStore } from '../../stores/useEditorStore';
import { getPartById } from '../../data/catalog';

const GHOST_VALID_COLOR = '#4ECDC4';   // Teal
const GHOST_INVALID_COLOR = '#FF6B6B'; // Red
const GHOST_OPACITY = 0.5;

/**
 * Renders a semi-transparent preview of the part being dragged
 */
export function GhostLayer() {
    const {
        draggedPartId,
        ghostPosition,
        ghostRotation,
        ghostValid,
        snapTarget
    } = useEditorStore();

    // No ghost if not dragging or no position set
    if (!draggedPartId || !ghostPosition) return null;

    const part = getPartById(draggedPartId);
    if (!part) return null;

    const color = ghostValid ? GHOST_VALID_COLOR : GHOST_INVALID_COLOR;

    // Calculate end position based on geometry
    if (part.geometry.type === 'straight') {
        const length = part.geometry.length;
        const radians = (ghostRotation * Math.PI) / 180;
        const endX = ghostPosition.x + Math.cos(radians) * length;
        const endY = ghostPosition.y + Math.sin(radians) * length;

        return (
            <Group>
                {/* Ghost track line */}
                <Line
                    points={[ghostPosition.x, ghostPosition.y, endX, endY]}
                    stroke={color}
                    strokeWidth={6}
                    lineCap="round"
                    opacity={GHOST_OPACITY}
                />

                {/* Start connector point */}
                <Circle
                    x={ghostPosition.x}
                    y={ghostPosition.y}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />

                {/* End connector point */}
                <Circle
                    x={endX}
                    y={endY}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />

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
    } else if (part.geometry.type === 'curve') {
        // Curve - simplified as arc approximation
        const { radius, angle } = part.geometry;
        const radians = (ghostRotation * Math.PI) / 180;
        const angleRad = (angle * Math.PI) / 180;

        // Arc center is perpendicular to start direction
        const centerAngle = radians - Math.PI / 2;
        const centerX = ghostPosition.x + Math.cos(centerAngle) * radius;
        const centerY = ghostPosition.y + Math.sin(centerAngle) * radius;

        // End position on the arc
        const endX = centerX + Math.cos(centerAngle + Math.PI + angleRad) * radius;
        const endY = centerY + Math.sin(centerAngle + Math.PI + angleRad) * radius;

        return (
            <Group>
                {/* Ghost arc - approximated with Konva Arc */}
                <Arc
                    x={centerX}
                    y={centerY}
                    innerRadius={radius - 3}
                    outerRadius={radius + 3}
                    angle={angle}
                    rotation={((centerAngle + Math.PI) * 180 / Math.PI)}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />

                {/* Start connector point */}
                <Circle
                    x={ghostPosition.x}
                    y={ghostPosition.y}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />

                {/* End connector point */}
                <Circle
                    x={endX}
                    y={endY}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />

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
    } else {
        // Switch/Crossing - not yet supported in ghost preview
        return null;
    }
}
