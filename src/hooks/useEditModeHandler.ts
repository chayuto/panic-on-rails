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
import { findBestSnapForTrack } from '../utils/snapManager';
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

        // Find snap target
        const openEndpoints = getOpenEndpoints();
        const bestSnap = findBestSnapForTrack(
            worldPos,
            userRotation,
            part,
            openEndpoints,
            selectedSystem
        );

        // Update ghost position and snap state
        if (bestSnap) {
            updateGhost(bestSnap.ghostPosition, bestSnap.ghostRotation, true);
            setSnapTarget(bestSnap.snap);
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

        // If we snapped to an existing node, connect them
        if (newEdgeId && snapTarget) {
            const { edges, nodes } = useTrackStore.getState();
            const newEdge = edges[newEdgeId];
            if (newEdge) {
                const startNode = nodes[newEdge.startNodeId];
                const endNode = nodes[newEdge.endNodeId];

                if (startNode && endNode) {
                    // Calculate distance from each node to the snap target position
                    const distToStart = Math.hypot(
                        startNode.position.x - snapTarget.targetPosition.x,
                        startNode.position.y - snapTarget.targetPosition.y
                    );
                    const distToEnd = Math.hypot(
                        endNode.position.x - snapTarget.targetPosition.x,
                        endNode.position.y - snapTarget.targetPosition.y
                    );

                    // The node closer to snap target is the one that should be merged
                    const nodeToRemove = distToStart < distToEnd ? newEdge.startNodeId : newEdge.endNodeId;

                    console.log('[useEditModeHandler] Connecting nodes:', {
                        survivorNodeId: snapTarget.targetNodeId.slice(0, 8),
                        nodeToRemove: nodeToRemove.slice(0, 8),
                        selectedNode: distToStart < distToEnd ? 'start' : 'end',
                    });

                    // Merge the closer node with the snap target
                    connectNodes(snapTarget.targetNodeId, nodeToRemove, newEdgeId);

                    // Check if the OTHER end of new track is also near an existing endpoint
                    const otherNewNodeId = nodeToRemove === newEdge.startNodeId
                        ? newEdge.endNodeId
                        : newEdge.startNodeId;

                    // Re-fetch state after first merge
                    const updatedState = useTrackStore.getState();
                    const otherNewNode = updatedState.nodes[otherNewNodeId];

                    if (otherNewNode) {
                        // Find open endpoints (excluding the one we just merged and the other new node)
                        const remainingEndpoints = updatedState.getOpenEndpoints().filter(
                            ep => ep.id !== snapTarget.targetNodeId && ep.id !== otherNewNodeId
                        );

                        // Check for nearby endpoint
                        const MERGE_THRESHOLD = 5; // pixels
                        const nearbyEndpoint = remainingEndpoints.find(ep => {
                            const dist = Math.hypot(
                                ep.position.x - otherNewNode.position.x,
                                ep.position.y - otherNewNode.position.y
                            );
                            return dist < MERGE_THRESHOLD;
                        });

                        if (nearbyEndpoint) {
                            console.log('[useEditModeHandler] Also connecting other end:', {
                                survivorNodeId: nearbyEndpoint.id.slice(0, 8),
                                nodeToRemove: otherNewNodeId.slice(0, 8),
                            });
                            connectNodes(nearbyEndpoint.id, otherNewNodeId, newEdgeId);
                        }
                    }

                    // Play snap sound based on track system
                    const { selectedSystem: currentSystem } = useEditorStore.getState();
                    playSound(currentSystem === 'wooden' ? 'snap-wooden' : 'snap-nscale');

                    // Log final state
                    const finalState = useTrackStore.getState();
                    console.log('[useEditModeHandler] Final state:', {
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
