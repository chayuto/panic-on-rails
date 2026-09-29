import type Konva from 'konva';
import { Group, Shape } from 'react-konva';
import { useMemo, useCallback } from 'react';
import { useTrackStore, type BoundingBox } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { useModeStore, useIsEditing } from '../../stores/useModeStore';
import { useVisibleEdges } from '../../hooks/useVisibleEdges';
import { useConnectMode } from '../../hooks/useConnectMode';
import { getEdgeWorldGeometry } from '../../hooks/useEdgeGeometry';
import { getPartById } from '../../data/catalog';
import { playHoverSound } from '../../utils/audioManager';
import type { Vector2 } from '../../types';

import { NodeRenderer } from './tracks';
import { EdgeHitTarget } from './tracks/EdgeHitTarget';
import { paintTrack, type PaintedEdge } from './tracks/trackPainter';
import { SwitchRenderer } from './SwitchRenderer';
import { useTrackInteraction } from './hooks/useTrackInteraction';
import { useNodeInteraction } from './hooks/useNodeInteraction';

/** Roadbed width (mm) for parts that don't say. */
const DEFAULT_ROADBED = 25;

interface TrackLayerProps {
    /** Viewport bounds for visibility culling. If null, render all edges. */
    viewport: BoundingBox | null;
}

/**
 * Track layer: all visible track painted by one shape (see trackPainter),
 * plus switch controls, joint dots and buffer stops, and — while editing —
 * invisible click targets along each edge.
 */
export function TrackLayer({ viewport }: TrackLayerProps) {
    const nodes = useTrackStore(s => s.nodes);
    const edges = useTrackStore(s => s.edges);
    const selectedEdgeId = useEditorStore(s => s.selectedEdgeId);
    const editSubMode = useModeStore(s => s.editSubMode);
    const isEditing = useIsEditing();
    const { connectSource, isValidConnectTarget } = useConnectMode();

    const { handleEdgeClick } = useTrackInteraction();
    const {
        handleSwitchClick,
        handleNodeClick,
        triggerRipple,
        setHoveredSwitch,
    } = useNodeInteraction();

    const isConnectMode = editSubMode === 'connect';

    // Culling: only paint edges near the viewport
    const visibleEdgeIds = useVisibleEdges(viewport);
    const visibleEdges = useMemo(() => {
        const idSet = new Set(visibleEdgeIds);
        return Object.values(edges).filter(edge => idSet.has(edge.id));
    }, [edges, visibleEdgeIds]);

    // Turnout routes currently set against trains
    const inactiveEdges = useMemo(() => {
        const set = new Set<string>();
        for (const node of Object.values(nodes)) {
            if (node.type === 'switch' && node.switchBranches) {
                set.add(node.switchBranches[node.switchState === 1 ? 0 : 1]);
            }
        }
        return set;
    }, [nodes]);

    const painted = useMemo<PaintedEdge[]>(() => visibleEdges.flatMap(edge => {
        const geometry = getEdgeWorldGeometry(edge, nodes);
        if (!geometry) return [];
        const part = getPartById(edge.partId);
        return [{
            geometry,
            style: part?.scale === 'wooden' ? 'wooden' : 'model',
            width: part?.roadbedWidth ?? DEFAULT_ROADBED,
            roadWidth: part?.roadCrossing ? part.width : undefined,
            selected: edge.id === selectedEdgeId,
            inactive: inactiveEdges.has(edge.id),
        }];
    }), [visibleEdges, nodes, selectedEdgeId, inactiveEdges]);

    const paint = useCallback((ctx: Konva.Context, shape: Konva.Shape) => {
        const zoom = shape.getStage()?.scaleX() ?? 1;
        paintTrack(ctx._context, painted, zoom);
    }, [painted]);

    const onSwitchHoverEnter = useCallback((nodeId: string, position: Vector2) => {
        setHoveredSwitch(nodeId, position);
        playHoverSound();
    }, [setHoveredSwitch]);
    const onSwitchHoverLeave = useCallback(() => setHoveredSwitch(null), [setHoveredSwitch]);

    return (
        <Group>
            <Shape sceneFunc={paint} listening={false} perfectDrawEnabled={false} />

            {/* Click targets for selecting and deleting track (editor only) */}
            {isEditing && painted.map((p, i) => (
                <EdgeHitTarget
                    key={visibleEdges[i].id}
                    edgeId={visibleEdges[i].id}
                    geometry={p.geometry}
                    onClick={handleEdgeClick}
                />
            ))}

            {Object.values(nodes).map((node) => {
                if (node.type === 'switch') {
                    return (
                        <SwitchRenderer
                            key={node.id}
                            node={node}
                            edges={edges}
                            onSwitchClick={handleSwitchClick}
                            onRipple={triggerRipple}
                            onHoverEnter={onSwitchHoverEnter}
                            onHoverLeave={onSwitchHoverLeave}
                        />
                    );
                }

                // Joint dots are an editing aid; buffer stops are part of the track
                if (!isEditing && !node.bumper) return null;

                const isOpenEndpoint = node.connections.length === 1 && !node.bumper;
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
