/**
 * useEditModeHandler - Centralized hook for edit-mode canvas interactions
 * 
 * Extracted from StageWrapper.tsx to improve separation of concerns.
 * Handles:
 * - Drag-and-drop from Parts Bin
 * - Ghost preview positioning
 * - Snap detection
 * - Track placement with budget check
 * - Node connection logic
 * - Keyboard rotation (R key)
 */

import { useCallback, useEffect } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useBudgetStore } from '../stores/useBudgetStore';
import { useIsEditing } from '../stores/useModeStore';
import { findBestSnap } from '../utils/snapManager';
import { playSound } from '../utils/audioManager';
import { getPartById } from '../data/catalog';
import type { Vector2 } from '../types';

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

    const { addTrack, getOpenEndpoints, connectNodes } = useTrackStore();

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

        // Check budget
        const budgetStore = useBudgetStore.getState();
        if (!budgetStore.canAfford(part.cost)) {
            console.warn('[useEditModeHandler] Insufficient budget:', {
                part: part.name,
                cost: part.cost,
                balance: budgetStore.balance,
            });
            playSound('bounce'); // Rejection sound
            endDrag();
            return;
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

        // Spend the budget
        budgetStore.spend(part.cost);

        // Add the track
        const newEdgeId = addTrack(partId, finalPosition, finalRotation);
        console.log('[useEditModeHandler] Track added:', { newEdgeId: newEdgeId?.slice(0, 8) || 'failed' });

        // Post-placement: Always scan BOTH endpoints for nearby merge targets
        // This catches both snap-assisted placements AND near-misses where user dropped
        // close to an existing endpoint but snap detection didn't trigger
        if (newEdgeId) {
            const { edges } = useTrackStore.getState();
            const newEdge = edges[newEdgeId];

            if (newEdge) {
                const MERGE_THRESHOLD = 10; // pixels - slightly larger than snap tolerance to catch near-misses
                let mergedAny = false;
                const nodesToCheck = [newEdge.startNodeId, newEdge.endNodeId];

                for (const newNodeId of nodesToCheck) {
                    // Re-fetch state each iteration as previous merge may have changed it
                    const currentState = useTrackStore.getState();
                    const newNode = currentState.nodes[newNodeId];

                    // Skip if this node was already merged (deleted)
                    if (!newNode) continue;

                    // Find open endpoints excluding our own new nodes
                    const openEndpoints = currentState.getOpenEndpoints().filter(
                        ep => ep.id !== newEdge.startNodeId && ep.id !== newEdge.endNodeId
                    );

                    // Find nearest endpoint within threshold
                    let nearestEndpoint: typeof openEndpoints[0] | null = null;
                    let nearestDist = Infinity;

                    for (const ep of openEndpoints) {
                        const dist = Math.hypot(
                            ep.position.x - newNode.position.x,
                            ep.position.y - newNode.position.y
                        );
                        if (dist < MERGE_THRESHOLD && dist < nearestDist) {
                            // Forgiving merge logic for close placements:
                            // - Very close (< 3px): skip angle check entirely - clearly intentional
                            // - Close (3-10px): use 45° tolerance to catch arc misalignments
                            const skipAngleCheck = dist < 3;

                            let angleOk = skipAngleCheck;
                            if (!skipAngleCheck) {
                                let rotDiff = Math.abs(ep.rotation - newNode.rotation);
                                if (rotDiff > 180) rotDiff = 360 - rotDiff; // Normalize to [0, 180]
                                const facingError = Math.abs(rotDiff - 180); // How far from facing each other
                                angleOk = facingError < 45; // 45 degree tolerance for near-misses
                            }

                            if (angleOk) {
                                nearestEndpoint = ep;
                                nearestDist = dist;
                            }
                        }
                    }

                    if (nearestEndpoint) {
                        console.log('[useEditModeHandler] Auto-merging nearby node:', {
                            survivorNodeId: nearestEndpoint.id.slice(0, 8),
                            nodeToRemove: newNodeId.slice(0, 8),
                            distance: nearestDist.toFixed(1),
                        });
                        connectNodes(nearestEndpoint.id, newNodeId, newEdgeId);
                        mergedAny = true;
                    }
                }

                if (mergedAny) {
                    // Play snap sound based on track system
                    const { selectedSystem: currentSystem } = useEditorStore.getState();
                    playSound(currentSystem === 'wooden' ? 'snap-wooden' : 'snap-nscale');

                    // Log final state
                    const finalState = useTrackStore.getState();
                    console.log('[useEditModeHandler] Final state after auto-merge:', {
                        nodeCount: Object.keys(finalState.nodes).length,
                        edgeCount: Object.keys(finalState.edges).length,
                    });
                }
            }
        }

        // Clean up drag state
        endDrag();
    }, [isEditing, screenToWorld, userRotation, addTrack, connectNodes, endDrag]);

    return {
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
}
