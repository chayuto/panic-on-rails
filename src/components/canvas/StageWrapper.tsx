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
import { EffectsLayer } from './EffectsLayer';
import { CrashLayer } from './CrashLayer';
import { SimulationTooltip } from '../ui';
import { useEditorStore } from '../../stores/useEditorStore';
import { useIsEditing, useIsSimulating } from '../../stores/useModeStore';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useEditModeHandler } from '../../hooks/useEditModeHandler';
import { useCanvasViewport } from '../../hooks/useCanvasViewport';
import { useCanvasCoordinates } from '../../hooks/useCanvasCoordinates';
import { useSwitchInteraction } from '../../hooks/useSwitchInteraction';
import { initAudio } from '../../utils/audioManager';

interface StageWrapperProps {
    width?: number;
    height?: number;
}

export function StageWrapper({ width, height }: StageWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);

    // Tooltip position state (screen + world coords)
    const [tooltipPosition, setTooltipPosition] = useState<{
        screenX: number;
        screenY: number;
        worldX: number;
        worldY: number;
    } | null>(null);

    // ========================================
    // Viewport management (extracted hook)
    // ========================================
    const {
        dimensions,
        zoom,
        pan,
        viewport,
        setPan,
        handleWheelZoom,
    } = useCanvasViewport(containerRef, { width, height });

    // ========================================
    // Coordinate conversion (extracted hook)
    // ========================================
    const { screenToWorld } = useCanvasCoordinates({
        containerRef,
        zoom,
        pan,
    });

    // Get remaining editor state
    const { showGrid, draggedPartId } = useEditorStore();

    // Mode hooks for conditional rendering
    const isEditing = useIsEditing();
    const isSimulating = useIsSimulating();

    // Run the game loop for train simulation
    useGameLoop();

    // Enable keyboard shortcuts for switch interaction during simulation
    useSwitchInteraction({ enableKeyboard: isSimulating });

    // Initialize audio on first user interaction
    useEffect(() => {
        const handleUserInteraction = () => {
            initAudio();
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

    // ========================================
    // Edit mode handlers (extracted to hook)
    // ========================================
    const { handleDragOver, handleDragLeave, handleDrop } = useEditModeHandler({
        screenToWorld,
    });

    // ========================================
    // Canvas event handlers
    // ========================================

    // Mouse wheel zoom - delegates to viewport hook
    const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();

        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        handleWheelZoom(e.evt.deltaY, pointer.x, pointer.y);
    }, [handleWheelZoom]);

    // Pan with middle mouse or space+drag
    const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
        if (e.target === stageRef.current) {
            setPan(e.target.x(), e.target.y());
        }
    }, [setPan]);

    // Mouse move handler for simulation tooltip
    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isSimulating) return;

        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) {
            setTooltipPosition(null);
            return;
        }

        // Convert to world coordinates
        const worldX = (pointer.x - pan.x) / zoom;
        const worldY = (pointer.y - pan.y) / zoom;

        // Get screen coordinates from the event
        const rect = containerRef.current?.getBoundingClientRect();
        const screenX = rect ? e.evt.clientX : pointer.x;
        const screenY = rect ? e.evt.clientY : pointer.y;

        setTooltipPosition({ screenX, screenY, worldX, worldY });
    }, [isSimulating, pan.x, pan.y, zoom]);

    // Clear tooltip on mouse leave
    const handleMouseLeave = useCallback(() => {
        setTooltipPosition(null);
    }, []);

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
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Layer 1: Background + Effects (non-interactive) */}
                <Layer listening={false}>
                    <BackgroundLayer
                        width={dimensions.width}
                        height={dimensions.height}
                        zoom={zoom}
                        pan={pan}
                        showGrid={showGrid}
                    />
                    <EffectsLayer />
                </Layer>

                {/* Layer 2: Track + Logic (interactive) */}
                <Layer>
                    <TrackLayer viewport={viewport} />
                    <WireLayer />
                    <SensorLayer />
                    <SignalLayer />
                </Layer>

                {/* Layer 3: Ghost (conditional, edit mode + dragging) */}
                {/* Note: Layer rendered when draggedPartId exists; GhostLayer handles null position internally */}
                {isEditing && draggedPartId && (
                    <Layer listening={false}>
                        <GhostLayer />
                    </Layer>
                )}

                {/* Layer 4: Simulation (conditional, trains + crash debris) */}
                {isSimulating && (
                    <Layer>
                        <TrainLayer />
                        <CrashLayer />
                    </Layer>
                )}
            </Stage>

            {/* Viewport warning for small screens */}
            {dimensions.width < 768 && (
                <div className="viewport-warning">
                    <p>PanicOnRails works best on desktop or tablet.</p>
                </div>
            )}

            {/* Simulation mode tooltip */}
            {isSimulating && tooltipPosition && (
                <SimulationTooltip
                    screenX={tooltipPosition.screenX}
                    screenY={tooltipPosition.screenY}
                    worldX={tooltipPosition.worldX}
                    worldY={tooltipPosition.worldY}
                />
            )}
        </div>
    );
}
