import { Group, Line, Circle } from 'react-konva';
import { useTrackStore } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';

const RAIL_COLOR = '#888888';
const RAIL_SELECTED_COLOR = '#00FF88';
const NODE_COLOR = '#4ECDC4';
const NODE_RADIUS = 6;

export function TrackLayer() {
    const { nodes, edges } = useTrackStore();
    const { selectedEdgeId, setSelectedEdge, mode } = useEditorStore();

    const handleEdgeClick = (edgeId: string) => {
        if (mode === 'edit') {
            setSelectedEdge(selectedEdgeId === edgeId ? null : edgeId);
        }
    };

    return (
        <Group>
            {/* Render all edges (tracks) */}
            {Object.values(edges).map((edge) => {
                const startNode = nodes[edge.startNodeId];
                const endNode = nodes[edge.endNodeId];

                if (!startNode || !endNode) return null;

                const isSelected = selectedEdgeId === edge.id;
                const color = isSelected ? RAIL_SELECTED_COLOR : RAIL_COLOR;

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
                            strokeWidth={isSelected ? 6 : 4}
                            lineCap="round"
                            onClick={() => handleEdgeClick(edge.id)}
                            onTap={() => handleEdgeClick(edge.id)}
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
                            strokeWidth={isSelected ? 6 : 4}
                            lineCap="round"
                            dash={[10, 5]} // Dashed to indicate it's a curve placeholder
                            onClick={() => handleEdgeClick(edge.id)}
                            onTap={() => handleEdgeClick(edge.id)}
                            hitStrokeWidth={12}
                        />
                    );
                }
            })}

            {/* Render all nodes (connection points) */}
            {Object.values(nodes).map((node) => (
                <Circle
                    key={node.id}
                    x={node.position.x}
                    y={node.position.y}
                    radius={NODE_RADIUS}
                    fill={NODE_COLOR}
                    stroke="#1A1A1A"
                    strokeWidth={2}
                />
            ))}
        </Group>
    );
}
