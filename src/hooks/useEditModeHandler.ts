/**
 * useEditModeHandler - Centralized hook for edit-mode canvas interactions
 * 
 * Extracted from StageWrapper.tsx to improve separation of concerns.
 * Handles:
 * - Drag-and-drop from Parts Bin
 * - Ghost preview positioning
 * - Snap detection
 * - Track placement, limited to the pieces left in the player's collection
 * - Node connection logic
 * - Keyboard rotation (R key)
 */

import { useCallback, useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { countPlacedPieces, inventoryOf } from '../data/collection';
import { useHistoryStore } from '../stores/useHistoryStore';
import { useIsEditing } from '../stores/useModeStore';
import { findBestSnap } from '../utils/snapManager';
import { playSound } from '../utils/audioManager';
import { getPartById } from '../data/catalog';
import type { Vector2 } from '../types';
import { joinPlacedPiece, openEndsOfPiece } from '../utils/joinPiece';
import { keepInView } from '../utils/viewFit';

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

    const {
        draggedPartId,
        userRotation,
        selectedSystem,
        updateGhost,
        setSnapTarget,
        endDrag,
        rotateGhostCW,
        rotateGhostCCW,
    } = useEditorStore();

    const { addTrack, getOpenEndpoints } = useTrackStore();

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
        const openEndpoints = getOpenEndpoints();
        const bestSnap = findBestSnap(
            part,
            worldPos,
            userRotation,
            openEndpoints,
            selectedSystem
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
    }, [isEditing, draggedPartId, userRotation, screenToWorld, getOpenEndpoints, selectedSystem, updateGhost, setSnapTarget]);

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

        if (!isEditing) {
            endDrag();
            return;
        }

        const partId = e.dataTransfer.getData('application/x-part-id');
        if (!partId) {
            endDrag();
            return;
        }

        // Get part to check cost
        const part = getPartById(partId);
        if (!part) {
            console.error('[useEditModeHandler] Part not found:', partId);
            endDrag();
            return;
        }

        // In collection mode, only pieces still in the box can be placed
        const collection = useCollectionStore.getState();
        if (collection.mode === 'collection') {
            const owned = inventoryOf(collection.ownedSets, collection.looseParts)[partId] ?? 0;
            const onTable = countPlacedPieces(useTrackStore.getState().edges)[partId] ?? 0;
            if (onTable >= owned) {
                playSound('bounce'); // Rejection sound
                endDrag();
                return;
            }
        }

        const worldPos = screenToWorld(e.clientX, e.clientY);

        // Get current snap state
        const { snapTarget, ghostRotation, ghostPosition } = useEditorStore.getState();

        console.log('[useEditModeHandler] Drop initiated:', {
            partId,
            worldPos,
            hasSnapTarget: !!snapTarget,
            ghostRotation,
        });

        // Determine final position and rotation
        let finalPosition = worldPos;
        let finalRotation = userRotation;

        if (snapTarget && ghostPosition) {
            finalPosition = ghostPosition;
            finalRotation = ghostRotation;

            console.log('[useEditModeHandler] Snapping using ghost transform:', {
                targetNodeId: snapTarget.targetNodeId.slice(0, 8),
                finalPosition,
                finalRotation,
            });
        }

        // Snapshot state before the placement so this gesture (add +
        // auto-merge) can be undone as a single step.
        useHistoryStore.getState().record();

        // Add the track
        const newEdgeId = addTrack(partId, finalPosition, finalRotation);
        console.log('[useEditModeHandler] Track added:', { newEdgeId: newEdgeId?.slice(0, 8) || 'failed' });

        // Post-placement: join every open end of the new piece (a turnout's
        // three, a double crossover's four) to open ends it now touches. This
        // catches both snap-assisted placements AND near-misses where user
        // dropped close to an existing endpoint but snap detection didn't trigger
        if (newEdgeId && joinPlacedPiece(newEdgeId) > 0) {
            const { selectedSystem: currentSystem } = useEditorStore.getState();
            playSound(currentSystem === 'wooden' ? 'snap-wooden' : 'snap-nscale');
        }
        // Follow the build: keep the new piece's open ends, where the player
        // carries on from, in view
        if (newEdgeId) keepInView(openEndsOfPiece(newEdgeId));

        // Clean up drag state
        endDrag();
    }, [isEditing, screenToWorld, userRotation, addTrack, endDrag]);

    return {
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
}
