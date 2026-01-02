import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { BackgroundLayer } from './BackgroundLayer';
import { TrackLayer } from './TrackLayer';
import { GhostLayer } from './GhostLayer';
import { TrainLayer } from './TrainLayer';
import { SensorLayer } from './SensorLayer';
import { SignalLayer } from './SignalLayer';
import { WireLayer } from './WireLayer';
import { useEditorStore } from '../../stores/useEditorStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useGameLoop } from '../../hooks/useGameLoop';
import { findSnapTarget } from '../../utils/snapManager';
import { initAudio, playSound } from '../../utils/audioManager';
import { getPartById } from '../../data/catalog';

interface StageWrapperProps {
    width?: number;
    height?: number;
}

export function StageWrapper({ width, height }: StageWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const [dimensions, setDimensions] = useState({ width: width || 800, height: height || 600 });

    const {
        zoom, pan, setZoom, setPan, showGrid,
        draggedPartId, updateGhost, setSnapTarget, endDrag, selectedSystem
    } = useEditorStore();

    const { addTrack, getOpenEndpoints, connectNodes } = useTrackStore();

    // Run the game loop for train simulation
    useGameLoop();

    // Handle resize
    useEffect(() => {
        if (width && height) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight,
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [width, height]);

    // Initialize audio on first user interaction
    useEffect(() => {
        const handleUserInteraction = () => {
            initAudio();
            // Remove listener after first interaction
            window.removeEventListener('click', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
        };

        window.addEventListener('click', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);

        return () => {
            window.removeEventListener('click', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
        };
    }, []);

    // Convert screen coordinates to world coordinates
    const screenToWorld = useCallback((screenX: number, screenY: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };

        const x = (screenX - rect.left - pan.x) / zoom;
        const y = (screenY - rect.top - pan.y) / zoom;
        return { x, y };
    }, [pan, zoom]);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();

        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = zoom;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - pan.x) / oldScale,
            y: (pointer.y - pan.y) / oldScale,
        };

        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const factor = 1.1;
        const newScale = direction > 0 ? oldScale * factor : oldScale / factor;
        const clampedScale = Math.max(0.2, Math.min(5, newScale));

        setZoom(clampedScale);
        setPan(
            pointer.x - mousePointTo.x * clampedScale,
            pointer.y - mousePointTo.y * clampedScale
        );
    }, [zoom, pan, setZoom, setPan]);

    // Pan with middle mouse or space+drag
    const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
        if (e.target === stageRef.current) {
            setPan(e.target.x(), e.target.y());
        }
    }, [setPan]);

    // ========================================
    // Drag-and-drop from Parts Bin
    // ========================================

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        if (!draggedPartId) return;

        const worldPos = screenToWorld(e.clientX, e.clientY);

        // Get the part to determine connector position
        const part = getPartById(draggedPartId);
        if (!part) return;

        // For now, ghost rotation is 0 (horizontal)
        // TODO: Add rotation with keyboard modifier
        const ghostRotation = 0;

        // Find snap target
        const openEndpoints = getOpenEndpoints();
        const snapResult = findSnapTarget(
            worldPos,
            ghostRotation,
            openEndpoints,
            selectedSystem
        );

        // Update ghost position and snap state
        if (snapResult) {
            // Snap position: place ghost connector at target
            updateGhost(snapResult.targetPosition, snapResult.targetRotation + 180, true);
            setSnapTarget(snapResult);
        } else {
            updateGhost(worldPos, ghostRotation, true);
            setSnapTarget(null);
        }
    }, [draggedPartId, screenToWorld, getOpenEndpoints, selectedSystem, updateGhost, setSnapTarget]);

    const handleDragLeave = useCallback(() => {
        updateGhost(null);
        setSnapTarget(null);
    }, [updateGhost, setSnapTarget]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();

        const partId = e.dataTransfer.getData('application/x-part-id');
        if (!partId) {
            endDrag();
            return;
        }

        const worldPos = screenToWorld(e.clientX, e.clientY);

        // Get current snap state
        const { snapTarget, ghostRotation } = useEditorStore.getState();

        console.log('[handleDrop] Drop initiated:', {
            partId,
            worldPos,
            hasSnapTarget: !!snapTarget,
            ghostRotation,
        });

        // Determine final position and rotation
        let finalPosition = worldPos;
        let finalRotation = ghostRotation;

        if (snapTarget) {
            // Use snap position
            finalPosition = snapTarget.targetPosition;
            finalRotation = (snapTarget.targetRotation + 180) % 360;
            console.log('[handleDrop] Snapping to target:', {
                targetNodeId: snapTarget.targetNodeId.slice(0, 8),
                targetPosition: snapTarget.targetPosition,
                finalRotation,
            });
        }

        // Add the track
        const newEdgeId = addTrack(partId, finalPosition, finalRotation);
        console.log('[handleDrop] Track added:', { newEdgeId: newEdgeId?.slice(0, 8) || 'failed' });

        // If we snapped to an existing node, connect them
        if (newEdgeId && snapTarget) {
            // Get the new edge to find its start node
            const { edges } = useTrackStore.getState();
            const newEdge = edges[newEdgeId];
            if (newEdge) {
                console.log('[handleDrop] Connecting nodes:', {
                    survivorNodeId: snapTarget.targetNodeId.slice(0, 8),
                    newEdgeStartNodeId: newEdge.startNodeId.slice(0, 8),
                    newEdgeEndNodeId: newEdge.endNodeId.slice(0, 8),
                });
                // The new track's start node should connect to the snap target
                connectNodes(snapTarget.targetNodeId, newEdge.startNodeId, newEdgeId);

                // Play snap sound based on track system
                const { selectedSystem } = useEditorStore.getState();
                playSound(selectedSystem === 'wooden' ? 'snap-wooden' : 'snap-nscale');

                // Log final state
                const finalState = useTrackStore.getState();
                console.log('[handleDrop] Final state:', {
                    nodeCount: Object.keys(finalState.nodes).length,
                    edgeCount: Object.keys(finalState.edges).length,
                });
            }
        }

        // Clean up drag state
        endDrag();
    }, [screenToWorld, addTrack, connectNodes, endDrag]);

    // Determine cursor based on drag state
    const cursor = draggedPartId ? 'copy' : 'crosshair';

    return (
        <div
            ref={containerRef}
            className="canvas-container"
            style={{ cursor }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <Stage
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                scaleX={zoom}
                scaleY={zoom}
                x={pan.x}
                y={pan.y}
                draggable={!draggedPartId} // Disable pan during drag
                onWheel={handleWheel}
                onDragEnd={handleDragEnd}
            >
                {/* Background grid layer - static, listening disabled */}
                <Layer listening={false}>
                    <BackgroundLayer
                        width={dimensions.width}
                        height={dimensions.height}
                        zoom={zoom}
                        pan={pan}
                        showGrid={showGrid}
                    />
                </Layer>

                {/* Track layer - interactive */}
                <Layer>
                    <TrackLayer />
                </Layer>

                {/* Ghost layer - drag preview */}
                <Layer listening={false}>
                    <GhostLayer />
                </Layer>

                {/* Logic layers - sensors, signals, wires */}
                <Layer>
                    <WireLayer />
                    <SensorLayer />
                    <SignalLayer />
                </Layer>

                {/* Entity layer - trains */}
                <Layer>
                    <TrainLayer />
                </Layer>
            </Stage>

            {/* Viewport warning for small screens */}
            {dimensions.width < 768 && (
                <div className="viewport-warning">
                    <p>PanicOnRails works best on desktop or tablet.</p>
                </div>
            )}
        </div>
    );
}
