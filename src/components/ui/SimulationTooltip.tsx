/**
 * SimulationTooltip Component
 * 
 * Displays element details in a floating tooltip when hovering over
 * canvas elements in simulation mode. Desktop only.
 */

import { useState, useEffect } from 'react';
import { useIsSimulating } from '../../stores/useModeStore';
import { useHoveredElement, type HoveredElement } from '../../hooks/useHoveredElement';
import './SimulationTooltip.css';

// ===========================
// Tooltip Content Renderers
// ===========================

function TrainTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'train' }> }) {
    const { train, edge } = element;
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon">🚂</span>
                <span>Train</span>
            </div>
            <div className="simulation-tooltip-section">
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">ID:</span>
                    <span className="simulation-tooltip-value">{train.id}</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Speed:</span>
                    <span className="simulation-tooltip-value">{train.speed} px/s</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Direction:</span>
                    <span className="simulation-tooltip-value">{train.direction === 1 ? '→' : '←'}</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Edge:</span>
                    <span className="simulation-tooltip-value">{edge.id.slice(0, 8)}...</span>
                </div>
                {train.crashed && (
                    <div className="simulation-tooltip-row">
                        <span className="simulation-tooltip-label">Status:</span>
                        <span className="simulation-tooltip-value crashed">CRASHED</span>
                    </div>
                )}
            </div>
        </>
    );
}

function EdgeTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'edge' }> }) {
    const { edge, startNode, endNode } = element;
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon">🛤️</span>
                <span>Track Edge</span>
            </div>
            <div className="simulation-tooltip-section">
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">ID:</span>
                    <span className="simulation-tooltip-value">{edge.id.slice(0, 8)}...</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Part:</span>
                    <span className="simulation-tooltip-value">{edge.partId}</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Length:</span>
                    <span className="simulation-tooltip-value">{Math.round(edge.length)}px</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Type:</span>
                    <span className="simulation-tooltip-value">{edge.geometry.type}</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Start:</span>
                    <span className="simulation-tooltip-value">{startNode.type}</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">End:</span>
                    <span className="simulation-tooltip-value">{endNode.type}</span>
                </div>
            </div>
        </>
    );
}

function NodeTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'node' }> }) {
    const { node } = element;
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon">⚫</span>
                <span>Node</span>
            </div>
            <div className="simulation-tooltip-section">
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">ID:</span>
                    <span className="simulation-tooltip-value">{node.id.slice(0, 8)}...</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Type:</span>
                    <span className="simulation-tooltip-value">{node.type}</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Connections:</span>
                    <span className="simulation-tooltip-value">{node.connections.length}</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Rotation:</span>
                    <span className="simulation-tooltip-value">{Math.round(node.rotation)}°</span>
                </div>
            </div>
        </>
    );
}

function SwitchTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'switch' }> }) {
    const { node } = element;
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon">🔀</span>
                <span>Switch</span>
            </div>
            <div className="simulation-tooltip-section">
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">ID:</span>
                    <span className="simulation-tooltip-value">{node.id.slice(0, 8)}...</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">State:</span>
                    <span className={`simulation-tooltip-value ${node.switchState === 0 ? 'active' : ''}`}>
                        {node.switchState === 0 ? 'MAIN' : 'BRANCH'}
                    </span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Connections:</span>
                    <span className="simulation-tooltip-value">{node.connections.length}</span>
                </div>
            </div>
        </>
    );
}

function SensorTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'sensor' }> }) {
    const { sensor, edge } = element;
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon">📡</span>
                <span>Sensor</span>
            </div>
            <div className="simulation-tooltip-section">
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">ID:</span>
                    <span className="simulation-tooltip-value">{sensor.id.slice(0, 8)}...</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">State:</span>
                    <span className={`simulation-tooltip-value ${sensor.state === 'on' ? 'active' : 'inactive'}`}>
                        {sensor.state.toUpperCase()}
                    </span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Edge:</span>
                    <span className="simulation-tooltip-value">{edge.id.slice(0, 8)}...</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Position:</span>
                    <span className="simulation-tooltip-value">{Math.round(sensor.position)}px</span>
                </div>
            </div>
        </>
    );
}

function SignalTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'signal' }> }) {
    const { signal, node } = element;

    const stateColor = signal.state === 'green' ? 'active' :
        signal.state === 'red' ? 'crashed' : '';

    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon">🚦</span>
                <span>Signal</span>
            </div>
            <div className="simulation-tooltip-section">
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">ID:</span>
                    <span className="simulation-tooltip-value">{signal.id.slice(0, 8)}...</span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">State:</span>
                    <span className={`simulation-tooltip-value ${stateColor}`}>
                        {signal.state.toUpperCase()}
                    </span>
                </div>
                <div className="simulation-tooltip-row">
                    <span className="simulation-tooltip-label">Node:</span>
                    <span className="simulation-tooltip-value">{node.id.slice(0, 8)}...</span>
                </div>
            </div>
        </>
    );
}

// ===========================
// Main Component
// ===========================

interface SimulationTooltipProps {
    /** Screen X coordinate for tooltip position */
    screenX: number;
    /** Screen Y coordinate for tooltip position */
    screenY: number;
    /** World X coordinate for hit detection */
    worldX: number;
    /** World Y coordinate for hit detection */
    worldY: number;
}

export function SimulationTooltip({ screenX, screenY, worldX, worldY }: SimulationTooltipProps) {
    const [isDesktop, setIsDesktop] = useState(true);
    const isSimulating = useIsSimulating();

    // Detect if device supports hover (desktop)
    useEffect(() => {
        const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
        setIsDesktop(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setIsDesktop(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Get hovered element based on world position
    const worldPos = { x: worldX, y: worldY };
    const hoveredElement = useHoveredElement(worldPos);

    // Don't render if not simulating, not desktop, or no element hovered
    if (!isSimulating || !isDesktop || !hoveredElement) {
        return null;
    }

    // Determine tooltip class based on element type
    const tooltipClass = `simulation-tooltip ${hoveredElement.type}`;

    return (
        <div
            className={tooltipClass}
            style={{
                left: screenX,
                top: screenY,
            }}
        >
            {hoveredElement.type === 'train' && <TrainTooltipContent element={hoveredElement} />}
            {hoveredElement.type === 'edge' && <EdgeTooltipContent element={hoveredElement} />}
            {hoveredElement.type === 'node' && <NodeTooltipContent element={hoveredElement} />}
            {hoveredElement.type === 'switch' && <SwitchTooltipContent element={hoveredElement} />}
            {hoveredElement.type === 'sensor' && <SensorTooltipContent element={hoveredElement} />}
            {hoveredElement.type === 'signal' && <SignalTooltipContent element={hoveredElement} />}
        </div>
    );
}
