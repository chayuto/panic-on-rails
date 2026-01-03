import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
import { useIsEditing, useIsSimulating } from '../../stores/useModeStore';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useEditModeHandler } from '../../hooks/useEditModeHandler';
import { initAudio } from '../../utils/audioManager';

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
        draggedPartId, ghostPosition
    } = useEditorStore();

    // Mode hooks for conditional rendering
    const isEditing = useIsEditing();
    const isSimulating = useIsSimulating();

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

    // ========================================
    // Edit mode handlers (extracted to hook)
    // ========================================
    const { handleDragOver, handleDragLeave, handleDrop } = useEditModeHandler({
        screenToWorld,
    });

    // ========================================
    // Canvas event handlers
    // ========================================

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

    // Calculate viewport in world coordinates for visibility culling
    const viewport = useMemo(() => ({
        x: -pan.x / zoom,
        y: -pan.y / zoom,
        width: dimensions.width / zoom,
        height: dimensions.height / zoom,
    }), [pan.x, pan.y, zoom, dimensions.width, dimensions.height]);

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

                {/* Track layer - interactive, with viewport culling */}
                <Layer>
                    <TrackLayer viewport={viewport} />
                </Layer>

                {/* Ghost layer - edit mode only, when dragging */}
                {isEditing && draggedPartId && ghostPosition && (
                    <Layer listening={false}>
                        <GhostLayer />
                    </Layer>
                )}

                {/* Logic layers - sensors, signals, wires */}
                <Layer>
                    <WireLayer />
                    <SensorLayer />
                    <SignalLayer />
                </Layer>

                {/* Train layer - simulate mode only */}
                {isSimulating && (
                    <Layer>
                        <TrainLayer />
                    </Layer>
                )}
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
