/**
 * useEditModeHandler - Centralized hook for edit-mode canvas interactions
 * 
 * Extracted from StageWrapper.tsx to improve separation of concerns.
 * Handles:
 * - Drag-and-drop from Parts Bin
 * - Ghost preview positioning
 * - Snap detection
 * - Track placement (utils/placePiece: the collection's limit, snapping, joining)
 * - Keyboard rotation (R key)
 */

import { useCallback, useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useIsEditing } from '../stores/useModeStore';
import { findBestSnap } from '../utils/snapManager';
import { getPartById } from '../data/catalog';
import type { Vector2 } from '../types';
import { logger } from '../utils/logger';
import { placePart } from '../utils/placePiece';

interface UseEditModeHandlerOptions {
    /** Function to convert screen coordinates to world coordinates */
    screenToWorld: (screenX: number, screenY: number) => Vector2;
}

interface EditModeHandlers {
    /** Handle drag over event from Parts Bin */
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    /** Handle drag leave event */
    handleDragLeave: () => void;
    /** Handle drop event to place track */
    handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

/**
 * Hook that provides edit-mode-specific handlers for the canvas
 */
export function useEditModeHandler({ screenToWorld }: UseEditModeHandlerOptions): EditModeHandlers {
    const isEditing = useIsEditing();

    // Atomic selectors: this hook runs in StageWrapper, which a whole-store read re-renders
    const draggedPartId = useEditorStore(s => s.draggedPartId);
    const userRotation = useEditorStore(s => s.userRotation);
    const selectedSystem = useEditorStore(s => s.selectedSystem);
    const updateGhost = useEditorStore(s => s.updateGhost);
    const setSnapTarget = useEditorStore(s => s.setSnapTarget);
    const endDrag = useEditorStore(s => s.endDrag);
    const rotateGhostCW = useEditorStore(s => s.rotateGhostCW);
    const rotateGhostCCW = useEditorStore(s => s.rotateGhostCCW);

    // ========================================
    // Keyboard: Rotation during drag
    // ========================================
    useEffect(() => {
        if (!isEditing || !draggedPartId) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key.toLowerCase() === 'r') {
                e.preventDefault();
                if (e.shiftKey) {
                    rotateGhostCCW();
                } else {
                    rotateGhostCW();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, draggedPartId, rotateGhostCW, rotateGhostCCW]);

    // ========================================
    // Drag Over: Update ghost preview
    // ========================================
    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        if (!isEditing || !draggedPartId) return;

        const worldPos = screenToWorld(e.clientX, e.clientY);
        const part = getPartById(draggedPartId);
        if (!part) return;

        // Find snap target using new multi-node snap manager
        const openEndpoints = useTrackStore.getState().getOpenEndpoints();
        const bestSnap = findBestSnap(
            part,
            worldPos,
            userRotation,
            openEndpoints,
            selectedSystem,
            useTrackStore.getState().edges
        );

        // Update ghost position and snap state
        if (bestSnap) {
            updateGhost(bestSnap.ghostTransform.position, bestSnap.ghostTransform.rotation, true);
            // Convert to legacy SnapResult format for compatibility
            setSnapTarget({
                targetNodeId: bestSnap.targetNodeId,
                targetPosition: bestSnap.targetPosition,
                targetRotation: bestSnap.targetFacade,
                distance: bestSnap.distance,
            });
        } else {
            updateGhost(worldPos, userRotation, true);
            setSnapTarget(null);
        }
    }, [isEditing, draggedPartId, userRotation, screenToWorld, selectedSystem, updateGhost, setSnapTarget]);

    // ========================================
    // Drag Leave: Clear ghost
    // ========================================
    const handleDragLeave = useCallback(() => {
        updateGhost(null);
        setSnapTarget(null);
    }, [updateGhost, setSnapTarget]);

    // ========================================
    // Drop: Place track
    // ========================================
    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const partId = e.dataTransfer.getData('application/x-part-id');
        if (isEditing && partId) {
            const at = screenToWorld(e.clientX, e.clientY);
            logger.debug('useEditModeHandler', 'Drop:', { partId, at });
            // Snapped where the ghost showed it, joined, one undo step (utils/placePiece)
            placePart(partId, at, useEditorStore.getState().userRotation);
        }
        endDrag();
    }, [isEditing, screenToWorld, endDrag]);

    return {
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
}
