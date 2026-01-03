/**
 * Performance Metrics Hook for Debug Overlay
 * 
 * Collects real-time performance metrics including FPS, frame time,
 * object counts from stores, and heap memory (Chrome only).
 */

import { useState, useEffect, useRef } from 'react';
import { useTrackStore } from '../stores/useTrackStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useLogicStore } from '../stores/useLogicStore';

// ===========================
// Types
// ===========================

export interface PerformanceMetrics {
    fps: number;
    frameTime: number;        // milliseconds
    trackCount: number;
    nodeCount: number;
    trainCount: number;
    sensorCount: number;
    signalCount: number;
    wireCount: number;
    heapSizeMB: number | null;  // Chrome only
}

const initialMetrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    trackCount: 0,
    nodeCount: 0,
    trainCount: 0,
    sensorCount: 0,
    signalCount: 0,
    wireCount: 0,
    heapSizeMB: null,
};

// ===========================
// Hook Implementation
// ===========================

export function usePerformanceMetrics(): PerformanceMetrics {
    const [metrics, setMetrics] = useState<PerformanceMetrics>(initialMetrics);
    const frameCountRef = useRef(0);
    const lastSecondRef = useRef(performance.now());
    const lastFrameRef = useRef(performance.now());

    // Get counts from stores (selective subscriptions to minimize re-renders)
    const edges = useTrackStore(state => state.edges);
    const nodes = useTrackStore(state => state.nodes);
    const trains = useSimulationStore(state => state.trains);
    const sensors = useLogicStore(state => state.sensors);
    const signals = useLogicStore(state => state.signals);
    const wires = useLogicStore(state => state.wires);

    // FPS tracking loop
    useEffect(() => {
        let frameId: number;
        let active = true;

        const loop = () => {
            if (!active) return;

            const now = performance.now();
            frameCountRef.current++;

            // Calculate frame time
            const frameTime = now - lastFrameRef.current;
            lastFrameRef.current = now;

            // Update FPS every second
            if (now - lastSecondRef.current >= 1000) {
                const fps = frameCountRef.current;
                frameCountRef.current = 0;
                lastSecondRef.current = now;

                // Get heap size (Chrome only)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const memory = (performance as any).memory;
                const heapSizeMB = memory
                    ? Math.round(memory.usedJSHeapSize / 1024 / 1024 * 10) / 10
                    : null;

                setMetrics(prev => ({
                    ...prev,
                    fps,
                    frameTime: Math.round(frameTime * 10) / 10,
                    heapSizeMB,
                }));
            }

            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);

        return () => {
            active = false;
            cancelAnimationFrame(frameId);
        };
    }, []);

    // Update object counts when stores change
    useEffect(() => {
        setMetrics(prev => ({
            ...prev,
            trackCount: Object.keys(edges).length,
            nodeCount: Object.keys(nodes).length,
            trainCount: Object.keys(trains).length,
            sensorCount: Object.keys(sensors).length,
            signalCount: Object.keys(signals).length,
            wireCount: Object.keys(wires).length,
        }));
    }, [edges, nodes, trains, sensors, signals, wires]);

    return metrics;
}
