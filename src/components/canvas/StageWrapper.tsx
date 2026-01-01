import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { BackgroundLayer } from './BackgroundLayer';
import { TrackLayer } from './TrackLayer';
import { useEditorStore } from '../../stores/useEditorStore';

interface StageWrapperProps {
    width?: number;
    height?: number;
}

export function StageWrapper({ width, height }: StageWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const [dimensions, setDimensions] = useState({ width: width || 800, height: height || 600 });

    const { zoom, pan, setZoom, setPan, showGrid } = useEditorStore();

    // Handle resize
    useEffect(() => {
        if (width && height) return; // Skip if dimensions provided

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

        // Zoom direction
        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const factor = 1.1;
        const newScale = direction > 0 ? oldScale * factor : oldScale / factor;

        // Clamp zoom
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

    return (
        <div
            ref={containerRef}
            className="canvas-container"
            style={{ cursor: 'crosshair' }}
        >
            <Stage
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                scaleX={zoom}
                scaleY={zoom}
                x={pan.x}
                y={pan.y}
                draggable
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

                {/* Entity layer - trains (will use transient updates) */}
                <Layer>
                    {/* TrainLayer will go here */}
                </Layer>
            </Stage>

            {/* Viewport warning for small screens */}
            {dimensions.width < 768 && (
                <div className="viewport-warning">
                    <p>⚠️ PanicOnRails works best on desktop or tablet.</p>
                </div>
            )}
        </div>
    );
}
