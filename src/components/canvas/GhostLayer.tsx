import { Line, Arc, Circle, Group } from 'react-konva';
import { useEditorStore } from '../../stores/useEditorStore';
import { useIsEditing } from '../../stores/useModeStore';
import { getPartById } from '../../data/catalog';

const GHOST_VALID_COLOR = '#4ECDC4';   // Teal
const GHOST_INVALID_COLOR = '#FF6B6B'; // Red
const GHOST_OPACITY = 0.5;

/**
 * Renders a semi-transparent preview of the part being dragged (edit mode only)
 */
export function GhostLayer() {
    const isEditing = useIsEditing();
    const {
        draggedPartId,
        ghostPosition,
        ghostRotation,
        ghostValid,
        snapTarget
    } = useEditorStore();

    // Don't render in simulate mode
    if (!isEditing) return null;

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
            <Group listening={false}>
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
            <Group listening={false}>
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
    } else if (part.geometry.type === 'switch') {
        // Switch ghost - shows main and branch paths
        const { mainLength, branchRadius, branchLength, branchAngle, branchDirection, isWye } = part.geometry;
        const radians = (ghostRotation * Math.PI) / 180;
        const branchAngleDir = branchDirection === 'left' ? -1 : 1;

        // Entry position is ghostPosition
        const entryX = ghostPosition.x;
        const entryY = ghostPosition.y;

        // Main exit position (straight ahead from entry)
        const mainX = entryX + Math.cos(radians) * mainLength;
        const mainY = entryY + Math.sin(radians) * mainLength;

        // Branch exit position (curved or straight)
        let branchX: number;
        let branchY: number;

        if (branchRadius !== undefined) {
            // Curved diverge: calculate arc endpoint
            const arcAngleRad = (branchAngle * Math.PI) / 180;
            const localX = branchRadius * Math.sin(arcAngleRad);
            const localY = branchAngleDir * branchRadius * (1 - Math.cos(arcAngleRad));
            // Transform to world coordinates
            branchX = entryX + Math.cos(radians) * localX - Math.sin(radians) * localY;
            branchY = entryY + Math.sin(radians) * localX + Math.cos(radians) * localY;
        } else {
            // Straight diverge
            const effectiveLength = branchLength ?? mainLength;
            const branchRad = radians + (branchAngleDir * branchAngle * Math.PI) / 180;
            branchX = entryX + Math.cos(branchRad) * effectiveLength;
            branchY = entryY + Math.sin(branchRad) * effectiveLength;
        }

        // For wye turnouts, calculate second branch (mirror of first)
        const secondBranchX = isWye
            ? entryX + Math.cos(radians) * (branchRadius !== undefined
                ? branchRadius * Math.sin((branchAngle * Math.PI) / 180)
                : (branchLength ?? mainLength) * Math.cos((branchAngle * Math.PI) / 180))
            - Math.sin(radians) * (-branchAngleDir * (branchRadius ?? branchLength ?? mainLength) * (1 - Math.cos((branchAngle * Math.PI) / 180)))
            : null;
        const secondBranchY = isWye
            ? entryY + Math.sin(radians) * (branchRadius !== undefined
                ? branchRadius * Math.sin((branchAngle * Math.PI) / 180)
                : (branchLength ?? mainLength) * Math.cos((branchAngle * Math.PI) / 180))
            + Math.cos(radians) * (-branchAngleDir * (branchRadius ?? branchLength ?? mainLength) * (1 - Math.cos((branchAngle * Math.PI) / 180)))
            : null;

        return (
            <Group listening={false}>
                {/* Main path (only for non-wye) */}
                {!isWye && (
                    <Line
                        points={[entryX, entryY, mainX, mainY]}
                        stroke={color}
                        strokeWidth={6}
                        lineCap="round"
                        opacity={GHOST_OPACITY}
                    />
                )}

                {/* Branch path */}
                <Line
                    points={[entryX, entryY, branchX, branchY]}
                    stroke={color}
                    strokeWidth={6}
                    lineCap="round"
                    opacity={GHOST_OPACITY}
                />

                {/* Second branch for wye */}
                {isWye && secondBranchX !== null && secondBranchY !== null && (
                    <Line
                        points={[entryX, entryY, secondBranchX, secondBranchY]}
                        stroke={color}
                        strokeWidth={6}
                        lineCap="round"
                        opacity={GHOST_OPACITY}
                    />
                )}

                {/* Entry connector */}
                <Circle
                    x={entryX}
                    y={entryY}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />

                {/* Main exit connector (non-wye only) */}
                {!isWye && (
                    <Circle
                        x={mainX}
                        y={mainY}
                        radius={6}
                        fill={color}
                        opacity={GHOST_OPACITY}
                    />
                )}

                {/* Branch exit connector */}
                <Circle
                    x={branchX}
                    y={branchY}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />

                {/* Second branch connector for wye */}
                {isWye && secondBranchX !== null && secondBranchY !== null && (
                    <Circle
                        x={secondBranchX}
                        y={secondBranchY}
                        radius={6}
                        fill={color}
                        opacity={GHOST_OPACITY}
                    />
                )}

                {/* Snap indicator */}
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
        // Crossing or other types - simplified rectangle
        return null;
    }
}
