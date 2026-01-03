import { Group, Line, Circle, Wedge } from 'react-konva';
import type Konva from 'konva';
import { useTrackStore } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { useLogicStore } from '../../stores/useLogicStore';
import { playSound } from '../../utils/audioManager';
import type { TrackEdge, Vector2 } from '../../types';

const RAIL_COLOR = '#888888';
const RAIL_SELECTED_COLOR = '#00FF88';
const RAIL_INACTIVE_COLOR = '#555555';
const NODE_COLOR = '#4ECDC4';
const SWITCH_NODE_COLOR = '#FFD93D';
const NODE_RADIUS = 6;
const SWITCH_NODE_RADIUS = 10;

export function TrackLayer() {
    const { nodes, edges, toggleSwitch, removeTrack } = useTrackStore();
    const { selectedEdgeId, setSelectedEdge, mode, wireSource, clearWireSource } = useEditorStore();
    const { addSensor, addSignal, addWire } = useLogicStore();

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
        if (mode === 'edit') {
            setSelectedEdge(selectedEdgeId === edgeId ? null : edgeId);
        } else if (mode === 'delete') {
            removeTrack(edgeId);
            playSound('switch');
        } else if (mode === 'sensor') {
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
        if (mode === 'edit') {
            toggleSwitch(nodeId);
            playSound('switch');
        } else if (mode === 'signal') {
            addSignal(nodeId);
            playSound('switch');
        } else if (mode === 'wire') {
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
        if (mode === 'signal') {
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
            {/* Render all edges (tracks) */}
            {Object.values(edges).map((edge) => {
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
                    // Arc rendering - simplified for now
                    // TODO: Implement proper arc rendering with bezier approximation
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
                            dash={[10, 5]} // Dashed to indicate it's a curve placeholder
                            onClick={(e) => handleEdgeClick(edge.id, e)}
                            onTap={(e) => handleEdgeClick(edge.id, e)}
                            hitStrokeWidth={12}
                        />
                    );
                }
            })}

            {/* Render all nodes (connection points) */}
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
                return (
                    <Circle
                        key={node.id}
                        x={node.position.x}
                        y={node.position.y}
                        radius={NODE_RADIUS}
                        fill={NODE_COLOR}
                        stroke="#1A1A1A"
                        strokeWidth={2}
                        onClick={() => handleNodeClick(node.id)}
                        onTap={() => handleNodeClick(node.id)}
                    />
                );
            })}
        </Group>
    );
}
