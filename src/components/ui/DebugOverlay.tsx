/**
 * Debug Overlay Component
 * 
 * Displays real-time performance metrics in a developer-friendly overlay.
 * Activated via backtick key, URL parameter (?debug), or localStorage.
 */

import { useState, useEffect } from 'react';
import { usePerformanceMetrics, PerformanceMetrics } from '../../hooks/usePerformanceMetrics';
import './DebugOverlay.css';

// ===========================
// Color Helpers
// ===========================

function getFpsColor(fps: number): string {
    if (fps >= 55) return '#00ff00';  // Green - Excellent
    if (fps >= 30) return '#ffff00';  // Yellow - Acceptable
    return '#ff0000';                  // Red - Poor
}

function getFrameColor(ms: number): string {
    if (ms <= 17) return '#00ff00';   // Green - 60fps target
    if (ms <= 33) return '#ffff00';   // Yellow - 30fps
    return '#ff0000';                  // Red - Below 30fps
}

// ===========================
// MetricRow Sub-Component
// ===========================

interface MetricRowProps {
    label: string;
    value: string | number;
    color?: string;
}

function MetricRow({ label, value, color }: MetricRowProps) {
    return (
        <div className="debug-row">
            <span className="debug-label">{label}:</span>
            <span className="debug-value" style={{ color }}>{value}</span>
        </div>
    );
}

// ===========================
// Main Component
// ===========================

interface DebugOverlayContentProps {
    metrics: PerformanceMetrics;
    onClose: () => void;
}

function DebugOverlayContent({ metrics, onClose }: DebugOverlayContentProps) {
    return (
        <div className="debug-overlay">
            <div className="debug-header">
                <span>🔧 Debug</span>
                <button onClick={onClose} title="Close (`)">✕</button>
            </div>

            <div className="debug-section">
                <MetricRow
                    label="FPS"
                    value={metrics.fps}
                    color={getFpsColor(metrics.fps)}
                />
                <MetricRow
                    label="Frame"
                    value={`${metrics.frameTime}ms`}
                    color={getFrameColor(metrics.frameTime)}
                />
            </div>

            <div className="debug-separator" />

            <div className="debug-section">
                <MetricRow label="Tracks" value={metrics.trackCount} />
                <MetricRow label="Nodes" value={metrics.nodeCount} />
                <MetricRow label="Trains" value={metrics.trainCount} />
            </div>

            <div className="debug-separator" />

            <div className="debug-section">
                <MetricRow label="Sensors" value={metrics.sensorCount} />
                <MetricRow label="Signals" value={metrics.signalCount} />
                <MetricRow label="Wires" value={metrics.wireCount} />
            </div>

            {metrics.heapSizeMB !== null && (
                <>
                    <div className="debug-separator" />
                    <div className="debug-section">
                        <MetricRow label="Heap" value={`${metrics.heapSizeMB} MB`} />
                    </div>
                </>
            )}
        </div>
    );
}

export function DebugOverlay() {
    const [isVisible, setIsVisible] = useState(false);

    // Check activation sources on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('debug') || localStorage.getItem('panic-debug') === 'true') {
            setIsVisible(true);
        }
    }, []);

    // Keyboard shortcut: backtick (`) to toggle
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === '`') {
                e.preventDefault();
                setIsVisible(v => {
                    const next = !v;
                    localStorage.setItem('panic-debug', String(next));
                    return next;
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Only render metrics hook when visible to avoid overhead
    if (!isVisible) return null;

    return <DebugOverlayVisible onClose={() => setIsVisible(false)} />;
}

// Separate component to only run the hook when visible
function DebugOverlayVisible({ onClose }: { onClose: () => void }) {
    const metrics = usePerformanceMetrics();
    return <DebugOverlayContent metrics={metrics} onClose={onClose} />;
}
