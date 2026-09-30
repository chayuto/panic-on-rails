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
import { StationLayer } from './StationLayer';
import { SimulationTooltip } from '../ui';
import { useEditorStore } from '../../stores/useEditorStore';
import { useIsEditing, useIsSimulating } from '../../stores/useModeStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useGameLoop } from '../../hooks/useGameLoop';
import { useScreenShake } from '../../hooks/useScreenShake';
import { useEditModeHandler } from '../../hooks/useEditModeHandler';
import { useCanvasViewport } from '../../hooks/useCanvasViewport';
import { useCanvasCoordinates } from '../../hooks/useCanvasCoordinates';
import { useSwitchInteraction } from '../../hooks/useSwitchInteraction';
import { initAudio } from '../../utils/audioManager';
import { setStageRef } from '../../utils/debugBridge';
import { trainAt } from '../../utils/hitTesting';
import { TRAIN_CLICK_SLACK } from '../../config/interactions';
import type { Train } from '../../types';

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
    // Whether the pointer is over a train, which a click stops or starts
    const [overTrain, setOverTrain] = useState(false);
    // The small-screen warning, until the player has read it
    const [warned, setWarned] = useState(false);

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
    const showGrid = useEditorStore(s => s.showGrid);
    const draggedPartId = useEditorStore(s => s.draggedPartId);

    // Mode hooks for conditional rendering
    const isEditing = useIsEditing();
    const isSimulating = useIsSimulating();

    // Run the game loop for train simulation
    useGameLoop();
    const shake = useScreenShake();

    // Enable keyboard shortcuts for switch interaction during simulation
    useSwitchInteraction({ enableKeyboard: isSimulating });

    // Expose Konva stage ref for E2E testing
    useEffect(() => {
        setStageRef(stageRef.current);
        return () => setStageRef(null);
    }, []);

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

    // The train under the pointer, unless something that takes clicks (a
    // set of points' button, a signal) is there first
    const trainUnderPointer = useCallback((e: Konva.KonvaEventObject<Event>): Train | null => {
        const stage = stageRef.current;
        if (!stage || e.target !== stage) return null;
        const at = stage.getRelativePointerPosition();
        if (!at) return null;
        const { nodes, edges } = useTrackStore.getState();
        return trainAt(at, useSimulationStore.getState().trains, edges, nodes, TRAIN_CLICK_SLACK / zoom);
    }, [zoom]);

    // A click on a train stops it, or starts it again, as its Stop/Go button does
    const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isSimulating) return;
        const train = trainUnderPointer(e);
        if (!train || train.crashed) return;
        useSimulationStore.getState().setTrainStopped(train.id, !train.stopped);
    }, [isSimulating, trainUnderPointer]);

    // Mouse move handler for simulation tooltip
    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isSimulating) return;
        const train = trainUnderPointer(e);
        setOverTrain(!!train && !train.crashed);

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
    }, [isSimulating, pan.x, pan.y, zoom, trainUnderPointer]);

    // Clear tooltip on mouse leave
    const handleMouseLeave = useCallback(() => {
        setTooltipPosition(null);
        setOverTrain(false);
    }, []);

    // Determine cursor based on drag state
    const cursor = draggedPartId ? 'copy' : isSimulating && overTrain ? 'pointer' : 'crosshair';

    return (
        <div
            ref={containerRef}
            className="canvas-container"
            data-testid="canvas-container"
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
                x={pan.x + shake.x}
                y={pan.y + shake.y}
                draggable={!draggedPartId} // Disable pan during drag
                onWheel={handleWheel}
                onDragEnd={handleDragEnd}
                onClick={handleClick}
                onTap={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Layer 1: Background (non-interactive) */}
                <Layer listening={false}>
                    <BackgroundLayer
                        width={dimensions.width}
                        height={dimensions.height}
                        zoom={zoom}
                        pan={pan}
                        showGrid={showGrid}
                    />
                </Layer>

                {/* Layer 2: Track + Logic (interactive) */}
                <Layer>
                    <TrackLayer viewport={viewport} />
                    <StationLayer />
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

                {/* Layer 4: Simulation + effects (non-interactive, on top so crash
                    flashes and ripples draw over track and trains) */}
                <Layer listening={false}>
                    {isSimulating && <TrainLayer viewport={viewport} />}
                    {isSimulating && <CrashLayer />}
                    <EffectsLayer />
                </Layer>
            </Stage>

            {/* Viewport warning for small screens, until dismissed */}
            {dimensions.width < 768 && !warned && (
                <div className="viewport-warning" role="status">
                    <p>PanicOnRails works best on desktop or tablet.</p>
                    <button onClick={() => setWarned(true)} aria-label="Dismiss" title="Dismiss">×</button>
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
