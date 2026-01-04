/**
 * Measurement Overlay Component
 * 
 * Displays layout dimensions in real-world units (millimeters).
 * Helps users plan layouts for real play areas.
 * 
 * The coordinate system in this app uses 1 unit = 1 mm.
 * (Track parts are defined in mm, e.g., "Straight 248mm")
 */

import { useMemo } from 'react';
import { useTrackStore } from '../../stores/useTrackStore';
import { useEditorStore } from '../../stores/useEditorStore';
import './MeasurementOverlay.css';

// ===========================
// Types
// ===========================

interface LayoutBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
}

interface MeasurementData {
    bounds: LayoutBounds | null;
    trackCount: number;
    totalTrackLength: number;
}

// ===========================
// Helper Functions
// ===========================

/**
 * Format a measurement value for display
 */
function formatMeasurement(value: number): string {
    // Round to 1 decimal place for mm
    return value.toFixed(1);
}

/**
 * Convert mm to cm for display when appropriate
 */
function formatWithUnit(valueMm: number): { value: string; unit: string } {
    if (valueMm >= 1000) {
        // Show in meters for very large values
        return { value: (valueMm / 1000).toFixed(2), unit: 'm' };
    } else if (valueMm >= 100) {
        // Show in cm for medium values
        return { value: (valueMm / 10).toFixed(1), unit: 'cm' };
    }
    // Show in mm for small values
    return { value: formatMeasurement(valueMm), unit: 'mm' };
}

// ===========================
// Sub-Components
// ===========================

interface MeasurementRowProps {
    label: string;
    value: number;
}

function MeasurementRow({ label, value }: MeasurementRowProps) {
    const formatted = formatWithUnit(value);
    return (
        <div className="measurement-row">
            <span className="measurement-label">{label}:</span>
            <span className="measurement-value">
                {formatted.value}
                <span className="measurement-unit">{formatted.unit}</span>
            </span>
        </div>
    );
}

interface CountRowProps {
    label: string;
    value: number;
}

function CountRow({ label, value }: CountRowProps) {
    return (
        <div className="measurement-row">
            <span className="measurement-label">{label}:</span>
            <span className="measurement-value">{value}</span>
        </div>
    );
}

// ===========================
// Main Component
// ===========================

function useMeasurementData(): MeasurementData {
    const nodes = useTrackStore(s => s.nodes);
    const edges = useTrackStore(s => s.edges);

    return useMemo(() => {
        const nodeList = Object.values(nodes);
        const edgeList = Object.values(edges);

        if (nodeList.length === 0) {
            return {
                bounds: null,
                trackCount: 0,
                totalTrackLength: 0,
            };
        }

        // Calculate bounding box from all node positions
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const node of nodeList) {
            minX = Math.min(minX, node.position.x);
            maxX = Math.max(maxX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxY = Math.max(maxY, node.position.y);
        }

        // Calculate total track length
        const totalTrackLength = edgeList.reduce((sum, edge) => sum + edge.length, 0);

        return {
            bounds: {
                minX,
                maxX,
                minY,
                maxY,
                width: maxX - minX,
                height: maxY - minY,
            },
            trackCount: edgeList.length,
            totalTrackLength,
        };
    }, [nodes, edges]);
}

interface MeasurementOverlayContentProps {
    data: MeasurementData;
    onClose: () => void;
}

function MeasurementOverlayContent({ data, onClose }: MeasurementOverlayContentProps) {
    return (
        <div className="measurement-overlay">
            <div className="measurement-header">
                <span>📐 Measurements</span>
                <button onClick={onClose} title="Close (m)">✕</button>
            </div>

            {data.bounds ? (
                <>
                    <div className="measurement-section">
                        <MeasurementRow label="Width" value={data.bounds.width} />
                        <MeasurementRow label="Height" value={data.bounds.height} />
                    </div>

                    <div className="measurement-separator" />

                    <div className="measurement-section">
                        <CountRow label="Tracks" value={data.trackCount} />
                        <MeasurementRow label="Total Length" value={data.totalTrackLength} />
                    </div>
                </>
            ) : (
                <div className="measurement-empty">
                    No tracks placed yet
                </div>
            )}
        </div>
    );
}

export function MeasurementOverlay() {
    const showMeasurements = useEditorStore(s => s.showMeasurements);
    const toggleMeasurements = useEditorStore(s => s.toggleMeasurements);
    const data = useMeasurementData();

    if (!showMeasurements) return null;

    return (
        <MeasurementOverlayContent
            data={data}
            onClose={toggleMeasurements}
        />
    );
}
