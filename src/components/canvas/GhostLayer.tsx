import { useState, useEffect, useRef } from 'react';
import { Line, Arc, Circle, Group } from 'react-konva';
import { useEditorStore, type GhostState } from '../../stores/useEditorStore';
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

    const { position: ghostPosition, rotation: ghostRotation = 0, valid: ghostValid = true } = ghostState || {};

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
    } else if (part.geometry.type === 'crossing') {
        const { length, crossingAngle } = part.geometry;
        const radians = (ghostRotation * Math.PI) / 180;
        const halfLength = length / 2;

        // Main path (aligned with ghost rotation)
        const mainEndX = ghostPosition.x + Math.cos(radians) * length;
        const mainEndY = ghostPosition.y + Math.sin(radians) * length;

        // Calculate center for crossing path
        const centerX = ghostPosition.x + Math.cos(radians) * halfLength;
        const centerY = ghostPosition.y + Math.sin(radians) * halfLength;

        // Cross path (rotated by crossingAngle)
        const crossRadians = radians + (crossingAngle * Math.PI / 180);
        const crossStartX = centerX - Math.cos(crossRadians) * halfLength;
        const crossStartY = centerY - Math.sin(crossRadians) * halfLength;
        const crossEndX = centerX + Math.cos(crossRadians) * halfLength;
        const crossEndY = centerY + Math.sin(crossRadians) * halfLength;

        return (
            <Group listening={false}>
                {/* Main Path */}
                <Line
                    points={[ghostPosition.x, ghostPosition.y, mainEndX, mainEndY]}
                    stroke={color}
                    strokeWidth={6}
                    lineCap="round"
                    opacity={GHOST_OPACITY}
                />

                {/* Cross Path */}
                <Line
                    points={[crossStartX, crossStartY, crossEndX, crossEndY]}
                    stroke={color}
                    strokeWidth={6}
                    lineCap="round"
                    opacity={GHOST_OPACITY}
                />

                {/* Connector Points - Main */}
                <Circle
                    x={ghostPosition.x}
                    y={ghostPosition.y}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />
                <Circle
                    x={mainEndX}
                    y={mainEndY}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />

                {/* Connector Points - Cross */}
                <Circle
                    x={crossStartX}
                    y={crossStartY}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />
                <Circle
                    x={crossEndX}
                    y={crossEndY}
                    radius={6}
                    fill={color}
                    opacity={GHOST_OPACITY}
                />

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
    } else if (part.geometry.type === 'compound') {
        // Compound ghost - render each sub-part as simplified lines
        const { subParts, boundingBox } = part.geometry;
        const radians = (ghostRotation * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        // Helper to transform sub-part offset to world position
        const toWorld = (offset: { x: number; y: number }) => ({
            x: ghostPosition.x + cos * offset.x - sin * offset.y,
            y: ghostPosition.y + sin * offset.x + cos * offset.y,
        });

        // Render a simplified bounding rectangle + sub-part entry points
        const halfW = boundingBox.width / 2;
        const halfH = boundingBox.height / 2;
        const corners = [
            toWorld({ x: -halfW * 0.1, y: -halfH * 0.5 }),
            toWorld({ x: boundingBox.width * 0.9, y: -halfH * 0.5 }),
            toWorld({ x: boundingBox.width * 0.9, y: halfH * 0.5 }),
            toWorld({ x: -halfW * 0.1, y: halfH * 0.5 }),
        ];
        const rectPoints = corners.flatMap(c => [c.x, c.y]);

        // Render each sub-part as a line from its offset in its direction
        const subLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
        for (const sp of subParts) {
            const subPart = getPartById(sp.partRef);
            if (!subPart) continue;
            const start = toWorld(sp.offset);
            const subRot = ghostRotation + sp.rotation;
            const subRad = (subRot * Math.PI) / 180;
            // Estimate sub-part length
            let len = 100;
            const geo = subPart.geometry;
            if (geo.type === 'straight') len = geo.length;
            else if (geo.type === 'curve') len = geo.radius * (geo.angle * Math.PI / 180);
            else if (geo.type === 'switch') len = geo.mainLength;
            else if (geo.type === 'crossing') len = geo.length;

            subLines.push({
                x1: start.x,
                y1: start.y,
                x2: start.x + Math.cos(subRad) * len,
                y2: start.y + Math.sin(subRad) * len,
            });
        }

        return (
            <Group listening={false}>
                {/* Bounding outline */}
                <Line
                    points={rectPoints}
                    stroke={color}
                    strokeWidth={2}
                    closed
                    dash={[8, 4]}
                    opacity={GHOST_OPACITY * 0.5}
                />

                {/* Sub-part lines */}
                {subLines.map((line, i) => (
                    <Line
                        key={i}
                        points={[line.x1, line.y1, line.x2, line.y2]}
                        stroke={color}
                        strokeWidth={5}
                        lineCap="round"
                        opacity={GHOST_OPACITY}
                    />
                ))}

                {/* Sub-part start points */}
                {subLines.map((line, i) => (
                    <Circle
                        key={`c${i}`}
                        x={line.x1}
                        y={line.y1}
                        radius={5}
                        fill={color}
                        opacity={GHOST_OPACITY}
                    />
                ))}

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
        // Other types
        return null;
    }
}
