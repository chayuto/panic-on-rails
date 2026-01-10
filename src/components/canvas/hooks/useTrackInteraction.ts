import { useCallback } from 'react';
import type Konva from 'konva';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useEditorStore } from '../../../stores/useEditorStore';
import { useLogicStore } from '../../../stores/useLogicStore';
import { useModeStore, useIsEditing } from '../../../stores/useModeStore';
import { playSound } from '../../../utils/audioManager';
import type { TrackEdge, Vector2 } from '../../../types';

export function useTrackInteraction() {
    const { edges, removeTrack } = useTrackStore();
    const { selectedEdgeId, setSelectedEdge } = useEditorStore();
    const { addSensor } = useLogicStore();
    const { editSubMode } = useModeStore();
    const isEditing = useIsEditing();

    // Helper: Calculate distance along edge (ported from TrackLayer)
    const getPositionAlongEdge = useCallback((edge: TrackEdge, clickPos: Vector2): number => {
        if (edge.geometry.type === 'straight') {
            const { start, end } = edge.geometry;
            const edgeVec = { x: end.x - start.x, y: end.y - start.y };
            const clickVec = { x: clickPos.x - start.x, y: clickPos.y - start.y };
            const edgeLenSq = edgeVec.x * edgeVec.x + edgeVec.y * edgeVec.y;
            const dot = edgeVec.x * clickVec.x + edgeVec.y * clickVec.y;
            const t = Math.max(0, Math.min(1, dot / edgeLenSq));
            return t * edge.length;
        } else {
            return edge.length / 2;
        }
    }, []);

    const handleEdgeClick = useCallback((edgeId: string, e: Konva.KonvaEventObject<Event>) => {
        if (!isEditing) return;

        if (editSubMode === 'select') {
            setSelectedEdge(selectedEdgeId === edgeId ? null : edgeId);
        } else if (editSubMode === 'delete') {
            removeTrack(edgeId);
            playSound('switch');
        } else if (editSubMode === 'sensor') {
            const stage = e.target.getStage();
            if (!stage) return;
            const pointerPos = stage.getPointerPosition();
            if (!pointerPos) return;

            const transform = stage.getAbsoluteTransform().copy().invert();
            const worldPos = transform.point(pointerPos);
            const edge = edges[edgeId];
            if (!edge) return;

            const position = getPositionAlongEdge(edge, worldPos);
            addSensor(edgeId, position);
            playSound('switch');
        }
    }, [isEditing, editSubMode, selectedEdgeId, edges, removeTrack, setSelectedEdge, addSensor, getPositionAlongEdge]);

    return { handleEdgeClick };
}
