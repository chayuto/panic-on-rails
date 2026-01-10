import type Konva from 'konva';
import { Group } from 'react-konva';
import { useMemo, useRef, useEffect } from 'react';
import { useTrackStore, type BoundingBox } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { useModeStore, useIsEditing } from '../../stores/useModeStore';
import { useVisibleEdges } from '../../hooks/useVisibleEdges';
import { useConnectMode } from '../../hooks/useConnectMode';
import { playHoverSound } from '../../utils/audioManager';

// New R03 Components and Hooks
import { SleeperRenderer, TrackRenderer, NodeRenderer } from './tracks';
import { SwitchRenderer } from './SwitchRenderer';
import { useTrackInteraction } from './hooks/useTrackInteraction';
import { useNodeInteraction } from './hooks/useNodeInteraction';
import { INTERACTIONS } from '../../config/interactions';

interface TrackLayerProps {
    /** Viewport bounds for visibility culling. If null, render all edges. */
    viewport: BoundingBox | null;
}

export function TrackLayer({ viewport }: TrackLayerProps) {
    const { nodes, edges } = useTrackStore();
    const { selectedEdgeId } = useEditorStore();
    const { editSubMode } = useModeStore();
    const isEditing = useIsEditing();
    const { connectSource, isValidConnectTarget } = useConnectMode();

    // Hooks for interaction
    const { handleEdgeClick } = useTrackInteraction();
    const {
        handleSwitchClick,
        handleNodeClick,
        triggerRipple,
        setHoveredSwitch
    } = useNodeInteraction();

    // V6: Ref for caching track visuals
    const trackVisualsRef = useRef<Konva.Group>(null);

    // Check if we're in connect mode
    const isConnectMode = editSubMode === 'connect';

    // Get visible edge IDs from spatial index
    const visibleEdgeIds = useVisibleEdges(viewport);

    // Create a Set for O(1) lookup and filter edges
    const visibleEdges = useMemo(() => {
        const idSet = new Set(visibleEdgeIds);
        return Object.values(edges).filter(edge => idSet.has(edge.id));
    }, [edges, visibleEdgeIds]);

    // V6: Track content hash for cache invalidation
    const contentHash = useMemo(() => {
        return JSON.stringify({
            edgeIds: Object.keys(edges).sort(),
            nodePositions: Object.values(nodes).map(n => `${n.id}:${n.position.x},${n.position.y}`).sort(),
        });
    }, [edges, nodes]);

    // V6: Cache track visuals when not editing for performance
    useEffect(() => {
        const group = trackVisualsRef.current;
        if (!group) return;

        if (!isEditing && !selectedEdgeId) {
            // Cache after a short delay to ensure render is complete
            const timer = setTimeout(() => {
                group.cache({ pixelRatio: 2 });
            }, INTERACTIONS.CACHE_DELAY_MS);
            return () => clearTimeout(timer);
        } else {
            // Clear cache when editing
            group.clearCache();
        }
    }, [isEditing, selectedEdgeId, contentHash]);

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
            {/* V6: Cacheable track visuals group (sleepers + rails) */}
            <Group ref={trackVisualsRef}>
                {/* V5: Render sleepers first (behind rails) */}
                {visibleEdges.map((edge) => {
                    const startNode = nodes[edge.startNodeId];
                    const endNode = nodes[edge.endNodeId];
                    if (!startNode || !endNode) return null;

                    return (
                        <SleeperRenderer
                            key={`sleeper-${edge.id}`}
                            edge={edge}
                            startNode={startNode}
                            endNode={endNode}
                            nodes={nodes}
                        />
                    );
                })}

                {/* Render only visible edges (tracks) */}
                {visibleEdges.map((edge) => {
                    const startNode = nodes[edge.startNodeId];
                    const endNode = nodes[edge.endNodeId];
                    if (!startNode || !endNode) return null;

                    return (
                        <TrackRenderer
                            key={`track-${edge.id}`}
                            edge={edge}
                            startNode={startNode}
                            endNode={endNode}
                            nodes={nodes}
                            isSelected={selectedEdgeId === edge.id}
                            isSwitchActive={isEdgeActiveOnSwitch(edge.id)}
                            onClick={handleEdgeClick}
                        />
                    );
                })}
            </Group>

            {/* Render all nodes (connection points) - nodes are fewer so no culling needed */}
            {Object.values(nodes).map((node) => {
                // Switch nodes get special rendering via SwitchRenderer component
                if (node.type === 'switch') {
                    return (
                        <SwitchRenderer
                            key={node.id}
                            node={node}
                            edges={edges}
                            onSwitchClick={handleSwitchClick}
                            onRipple={triggerRipple}
                            onHoverEnter={(nodeId, pos) => {
                                setHoveredSwitch(nodeId, pos);
                                playHoverSound();
                            }}
                            onHoverLeave={() => setHoveredSwitch(null)}
                        />
                    );
                }

                // Regular nodes
                const isOpenEndpoint = node.connections.length === 1;
                const isSource = connectSource?.nodeId === node.id;
                const isValidTarget = isConnectMode && isOpenEndpoint && isValidConnectTarget(node.id);

                return (
                    <NodeRenderer
                        key={node.id}
                        node={node}
                        isSource={isSource}
                        isValidTarget={isValidTarget}
                        isConnectMode={isConnectMode}
                        isOpenEndpoint={isOpenEndpoint}
                        onClick={handleNodeClick}
                    />
                );
            })}
        </Group>
    );
}
