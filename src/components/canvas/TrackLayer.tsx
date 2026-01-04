import { Group, Line, Circle, Wedge, Arc, Ring } from 'react-konva';
import { useMemo } from 'react';
import type Konva from 'konva';
import { useTrackStore, type BoundingBox } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { useLogicStore } from '../../stores/useLogicStore';
import { useModeStore, useIsEditing } from '../../stores/useModeStore';
import { useVisibleEdges } from '../../hooks/useVisibleEdges';
import { useConnectMode } from '../../hooks/useConnectMode';
import { playSound } from '../../utils/audioManager';
import type { TrackEdge, Vector2 } from '../../types';

const RAIL_COLOR = '#888888';
const RAIL_SELECTED_COLOR = '#00FF88';
const RAIL_INACTIVE_COLOR = '#555555';
const NODE_COLOR = '#4ECDC4';
const SWITCH_NODE_COLOR = '#FFD93D';
const CONNECT_SOURCE_COLOR = '#00FF88';  // Green for selected source
const CONNECT_TARGET_COLOR = '#00BFFF';  // Cyan for valid targets
const NODE_RADIUS = 6;
const SWITCH_NODE_RADIUS = 10;
const CONNECT_HIGHLIGHT_RADIUS = 12;  // Outer glow radius

interface TrackLayerProps {
    /** Viewport bounds for visibility culling. If null, render all edges. */
    viewport: BoundingBox | null;
}

export function TrackLayer({ viewport }: TrackLayerProps) {
    const { nodes, edges, toggleSwitch, removeTrack } = useTrackStore();
    const { selectedEdgeId, setSelectedEdge, wireSource, clearWireSource } = useEditorStore();
    const { addSensor, addSignal, addWire } = useLogicStore();
    const { editSubMode } = useModeStore();
    const isEditing = useIsEditing();
    const { connectSource, isValidConnectTarget, handleConnectModeNodeClick } = useConnectMode();

    // Check if we're in connect mode
    const isConnectMode = editSubMode === 'connect';

    // Get visible edge IDs from spatial index
    const visibleEdgeIds = useVisibleEdges(viewport);

    // Create a Set for O(1) lookup and filter edges
    const visibleEdges = useMemo(() => {
        const idSet = new Set(visibleEdgeIds);
        return Object.values(edges).filter(edge => idSet.has(edge.id));
    }, [edges, visibleEdgeIds]);

    // Calculate distance along a straight edge from a point
    const getPositionAlongEdge = (edge: TrackEdge, clickPos: Vector2): number => {
        if (edge.geometry.type === 'straight') {
            const { start, end } = edge.geometry;
            const edgeVec = { x: end.x - start.x, y: end.y - start.y };
            const clickVec = { x: clickPos.x - start.x, y: clickPos.y - start.y };
            // Project click point onto edge vector
            const edgeLenSq = edgeVec.x * edgeVec.x + edgeVec.y * edgeVec.y;
            const dot = edgeVec.x * clickVec.x + edgeVec.y * clickVec.y;
            const t = Math.max(0, Math.min(1, dot / edgeLenSq));
            return t * edge.length;
        } else {
            // For arcs, just place at middle for now
            return edge.length / 2;
        }
    };

    const handleEdgeClick = (edgeId: string, e: Konva.KonvaEventObject<Event>) => {
        // Only handle clicks in edit mode
        if (!isEditing) return;

        if (editSubMode === 'select') {
            setSelectedEdge(selectedEdgeId === edgeId ? null : edgeId);
        } else if (editSubMode === 'delete') {
            removeTrack(edgeId);
            playSound('switch');
        } else if (editSubMode === 'sensor') {
            // Get click position in stage coordinates
            const stage = e.target.getStage();
            if (!stage) return;
            const pointerPos = stage.getPointerPosition();
            if (!pointerPos) return;

            // Convert to world coordinates (accounting for zoom/pan)
            const transform = stage.getAbsoluteTransform().copy().invert();
            const worldPos = transform.point(pointerPos);

            // Calculate position along edge
            const edge = edges[edgeId];
            if (!edge) return;
            const position = getPositionAlongEdge(edge, worldPos);

            addSensor(edgeId, position);
            playSound('switch');
        }
    };

    const handleSwitchClick = (nodeId: string) => {
        // Only handle clicks in edit mode
        if (!isEditing) return;

        if (editSubMode === 'select') {
            toggleSwitch(nodeId);
            playSound('switch');
        } else if (editSubMode === 'signal') {
            addSignal(nodeId);
            playSound('switch');
        } else if (editSubMode === 'wire') {
            // Switches can be wire targets
            if (wireSource) {
                addWire(
                    wireSource.type,
                    wireSource.id,
                    'switch',
                    nodeId,
                    'toggle'
                );
                playSound('switch');
                clearWireSource();
            }
        }
    };

    const handleNodeClick = (nodeId: string) => {
        // Only handle clicks in edit mode
        if (!isEditing) return;

        if (editSubMode === 'connect') {
            handleConnectModeNodeClick(nodeId);
        } else if (editSubMode === 'signal') {
            addSignal(nodeId);
            playSound('switch');
        }
    };

    // Helper to determine if edge is the active branch of a switch
    const isEdgeActiveOnSwitch = (edgeId: string): boolean | null => {
        // Find switch nodes connected to this edge
        for (const node of Object.values(nodes)) {
            if (node.type === 'switch' && node.switchBranches) {
                const [mainEdgeId, branchEdgeId] = node.switchBranches;
                if (edgeId === mainEdgeId) {
                    return node.switchState === 0; // Active if state is 0
                }
                if (edgeId === branchEdgeId) {
                    return node.switchState === 1; // Active if state is 1
                }
            }
        }
        return null; // Not part of a switch
    };

    return (
        <Group>
            {/* Render only visible edges (tracks) */}
            {visibleEdges.map((edge) => {
                const startNode = nodes[edge.startNodeId];
                const endNode = nodes[edge.endNodeId];

                if (!startNode || !endNode) return null;

                const isSelected = selectedEdgeId === edge.id;
                const switchActive = isEdgeActiveOnSwitch(edge.id);

                // Determine color: selected > switch inactive > normal
                let color = RAIL_COLOR;
                let strokeWidth = 4;

                if (isSelected) {
                    color = RAIL_SELECTED_COLOR;
                    strokeWidth = 6;
                } else if (switchActive === false) {
                    color = RAIL_INACTIVE_COLOR;
                    strokeWidth = 3;
                }

                if (edge.geometry.type === 'straight') {
                    return (
                        <Line
                            key={edge.id}
                            points={[
                                startNode.position.x,
                                startNode.position.y,
                                endNode.position.x,
                                endNode.position.y,
                            ]}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            lineCap="round"
                            onClick={(e) => handleEdgeClick(edge.id, e)}
                            onTap={(e) => handleEdgeClick(edge.id, e)}
                            hitStrokeWidth={12}
                        />
                    );
                } else {
                    // Arc rendering - using Konva Arc component
                    // startAngle and endAngle are now in DEGREES per constitution
                    const { center, radius, startAngle, endAngle } = edge.geometry;
                    const sweepDeg = endAngle - startAngle;

                    return (
                        <Arc
                            key={edge.id}
                            x={center.x}
                            y={center.y}
                            innerRadius={radius - strokeWidth / 2}
                            outerRadius={radius + strokeWidth / 2}
                            angle={sweepDeg}
                            rotation={startAngle}
                            fill={color}
                            onClick={(e) => handleEdgeClick(edge.id, e)}
                            onTap={(e) => handleEdgeClick(edge.id, e)}
                        />
                    );
                }
            })}

            {/* Render all nodes (connection points) - nodes are fewer so no culling needed */}
            {Object.values(nodes).map((node) => {
                // Switch nodes get special rendering
                if (node.type === 'switch') {
                    return (
                        <Group key={node.id}>
                            {/* Switch indicator - larger clickable circle */}
                            <Circle
                                x={node.position.x}
                                y={node.position.y}
                                radius={SWITCH_NODE_RADIUS}
                                fill={SWITCH_NODE_COLOR}
                                stroke="#1A1A1A"
                                strokeWidth={2}
                                onClick={() => handleSwitchClick(node.id)}
                                onTap={() => handleSwitchClick(node.id)}
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
                                rotation={node.rotation + 180 + (node.switchState === 1 ? 15 : 0)}
                                fill="#1A1A1A"
                            />
                        </Group>
                    );
                }

                // Regular nodes
                const isOpenEndpoint = node.connections.length === 1;
                const isSource = connectSource?.nodeId === node.id;
                const isValidTarget = isConnectMode && isOpenEndpoint && isValidConnectTarget(node.id);

                return (
                    <Group key={node.id}>
                        {/* Connect mode highlight ring */}
                        {isConnectMode && isOpenEndpoint && (
                            <Ring
                                x={node.position.x}
                                y={node.position.y}
                                innerRadius={CONNECT_HIGHLIGHT_RADIUS - 3}
                                outerRadius={CONNECT_HIGHLIGHT_RADIUS}
                                fill={isSource ? CONNECT_SOURCE_COLOR : (isValidTarget ? CONNECT_TARGET_COLOR : '#666666')}
                                opacity={isSource ? 0.9 : 0.6}
                            />
                        )}
                        {/* Main node circle */}
                        <Circle
                            x={node.position.x}
                            y={node.position.y}
                            radius={NODE_RADIUS}
                            fill={isSource ? CONNECT_SOURCE_COLOR : NODE_COLOR}
                            stroke="#1A1A1A"
                            strokeWidth={2}
                            onClick={() => handleNodeClick(node.id)}
                            onTap={() => handleNodeClick(node.id)}
                        />
                    </Group>
                );
            })}
        </Group>
    );
}
