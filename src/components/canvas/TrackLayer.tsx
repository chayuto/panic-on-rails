import type Konva from 'konva';
import { Group, Shape } from 'react-konva';
import { useMemo, useCallback } from 'react';
import { useTrackStore, type BoundingBox } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { useModeStore, useIsEditing } from '../../stores/useModeStore';
import { useVisibleEdges } from '../../hooks/useVisibleEdges';
import { useConnectMode } from '../../hooks/useConnectMode';
import { getPartById } from '../../data/catalog';
import { playHoverSound } from '../../utils/audioManager';
import type { EdgeId, NodeId, TrackEdge, TrackNode, Vector2 } from '../../types';
import { HEIGHT_TOLERANCE, heightOf } from '../../utils/elevation';
import { supportName, supportsAt } from '../../utils/piers';
import { isInsidePiece, isOpenEnd } from '../../utils/graphAnalysis';
import { branchSide, routeThroughPiece } from '../../utils/switchRouting';
import { getNodeFacadeFromEdge } from '../../utils/connectTransform';
import { deriveWorldGeometry, normalizeAngle } from '../../utils/geometry';
import { pointsButtonRadius } from '../../config/interactions';

import { NodeRenderer } from './tracks';
import { EdgeHitTarget } from './tracks/EdgeHitTarget';
import { paintTrack } from './tracks/trackPainter';
import { middleHeight, paintedEdges, piersUnder, type PlacedEdge } from './tracks/paintedEdges';
import { SwitchRenderer } from './SwitchRenderer';
import { useTrackInteraction } from './hooks/useTrackInteraction';
import { useNodeInteraction } from './hooks/useNodeInteraction';

interface TrackLayerProps {
    /** Viewport bounds for visibility culling. If null, render all edges. */
    viewport: BoundingBox | null;
}

/** What a raised joint stands on, for the Pier tool's labels. */
function pierLabel(node: TrackNode, edges: Record<EdgeId, TrackEdge>): string | undefined {
    if (heightOf(node) <= HEIGHT_TOLERANCE) return undefined;
    const supports = supportsAt(node, edges);
    return supports ? supportName(supports, node) : `${Math.round(heightOf(node))} mm`;
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
    // Only changes below the zoom where the points' buttons stop shrinking
    const pointsRadius = useEditorStore(s => pointsButtonRadius(s.zoom));
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

    // Routes through a piece that no set of points on them is set for: a
    // crossover's diagonal is live if the points at either end send trains
    // along it
    const inactiveEdges = useMemo(() => {
        const live = new Set<EdgeId>();
        const against = new Set<EdgeId>();
        for (const node of Object.values(nodes)) {
            if (node.type !== 'switch' || !node.switchBranches) continue;
            node.switchBranches.forEach((branch, i) => {
                const into = i === (node.switchState ?? 0) ? live : against;
                for (const id of routeThroughPiece(node.id, branch, edges, nodes).edges) into.add(id);
            });
        }
        for (const id of live) against.delete(id);
        return against;
    }, [nodes, edges]);

    // Each set of points: the way its main route leaves, and the side its branch goes
    const pointsLook = useMemo(() => {
        const looks = new Map<NodeId, { heading: number; side: 1 | -1 }>();
        for (const node of Object.values(nodes)) {
            const main = node.switchBranches && edges[node.switchBranches[0]];
            if (node.type !== 'switch' || !main) continue;
            looks.set(node.id, {
                heading: normalizeAngle(getNodeFacadeFromEdge(node.id, main) + 180),
                side: branchSide(node, edges, nodes),
            });
        }
        return looks;
    }, [nodes, edges]);

    // Each visible edge where it lies, lowest first so raised track's click
    // targets sit on top; the painter and click targets share it
    const placed = useMemo(() => visibleEdges.flatMap((edge): PlacedEdge[] => {
        const geometry = deriveWorldGeometry(edge, nodes);
        return geometry ? [{ edge, geometry, part: getPartById(edge.partId), height: middleHeight(edge, nodes) }] : [];
    }).sort((a, b) => a.height - b.height), [visibleEdges, nodes]);

    const painted = useMemo(
        () => paintedEdges(placed, selectedEdgeId, inactiveEdges),
        [placed, selectedEdgeId, inactiveEdges]
    );
    const piers = useMemo(() => piersUnder(placed, nodes), [placed, nodes]);

    const paint = useCallback((ctx: Konva.Context, shape: Konva.Shape) => {
        paintTrack(ctx._context, painted, shape.getStage()?.scaleX() ?? 1, piers);
    }, [painted, piers]);

    const onSwitchHoverEnter = useCallback((nodeId: string, position: Vector2) => {
        setHoveredSwitch(nodeId, position);
        playHoverSound();
    }, [setHoveredSwitch]);
    const onSwitchHoverLeave = useCallback(() => setHoveredSwitch(null), [setHoveredSwitch]);

    return (
        <Group>
            <Shape sceneFunc={paint} listening={false} perfectDrawEnabled={false} />

            {/* Click targets for selecting and deleting track (editor only) */}
            {isEditing && placed.map(({ edge, geometry }) => (
                <EdgeHitTarget
                    key={edge.id}
                    edgeId={edge.id}
                    geometry={geometry}
                    onClick={handleEdgeClick}
                />
            ))}

            {Object.values(nodes).map((node) => {
                if (node.type === 'switch') {
                    const look = pointsLook.get(node.id);
                    return (
                        <SwitchRenderer
                            key={node.id}
                            node={node}
                            heading={look?.heading ?? node.rotation + 180}
                            branchSide={look?.side ?? 1}
                            radius={pointsRadius}
                            onSwitchClick={handleSwitchClick}
                            onRipple={triggerRipple}
                            onHoverEnter={onSwitchHoverEnter}
                            onHoverLeave={onSwitchHoverLeave}
                        />
                    );
                }

                // Joint dots are an editing aid; buffer stops are part of the track
                if (!isEditing && !node.bumper) return null;
                // Where a piece's own track joins itself is no joint to show
                if (isInsidePiece(node, edges)) return null;

                const isOpenEndpoint = isOpenEnd(node);
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
                        label={editSubMode === 'pier' ? pierLabel(node, edges) : undefined}
                    />
                );
            })}
        </Group>
    );
}
