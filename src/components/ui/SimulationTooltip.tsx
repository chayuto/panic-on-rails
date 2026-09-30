/**
 * SimulationTooltip Component
 * 
 * Displays element details in a floating tooltip when hovering over
 * canvas elements in simulation mode. Desktop only.
 */

import { useState, useEffect } from 'react';
import { TrainFront, TrainTrack, Circle, GitBranch, Radio, TrafficCone } from 'lucide-react';
import { useIsSimulating } from '../../stores/useModeStore';
import { useHoveredElement, type HoveredElement } from '../../hooks/useHoveredElement';
import { scaleKmh } from '../../simulation/driving';
import { getRollingStock } from '../../data/rollingStock';
import { getPartById } from '../../data/catalog';
import { trackSystemName } from '../../data/brands';
import { heightOf, HEIGHT_TOLERANCE } from '../../utils/elevation';
import { isOpenEnd } from '../../utils/graphAnalysis';
import { pointsOccupied } from '../../utils/points';
import { useTrackStore } from '../../stores/useTrackStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { SCALES } from '../../config/scales';
import './SimulationTooltip.css';

// ===========================
// Tooltip Content Renderers
// ===========================

/** One line of the tooltip: what, and its value. */
function Row({ label, children, tone }: { label: string; children: React.ReactNode; tone?: 'active' | 'inactive' | 'crashed' }) {
    return (
        <div className="simulation-tooltip-row">
            <span className="simulation-tooltip-label">{label}</span>
            <span className={`simulation-tooltip-value ${tone ?? ''}`}>{children}</span>
        </div>
    );
}

/** What a click does, at the foot of the tooltip. */
function Hint({ children }: { children: React.ReactNode }) {
    return <div className="simulation-tooltip-hint">{children}</div>;
}

/** A height above the baseboard, if the track stands raised. */
function Raised({ height }: { height: number }) {
    return height > HEIGHT_TOLERANCE ? <Row label="Height:">{Math.round(height)} mm</Row> : null;
}

function TrainTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'train' }> }) {
    const { train } = element;
    const running = useSimulationStore(s => s.isRunning);
    const name = getRollingStock(train.stockId)?.name ?? train.id.replace('train-', 'Train ');
    const status = train.crashed ? 'wrecked' : train.stopped ? 'stopped' : train.heldAtSignal ? 'held at a signal'
        : train.dwell !== undefined ? 'at a station' : running ? 'running' : 'paused';
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon"><TrainFront size={14} /></span>
                <span>{name}</span>
            </div>
            <div className="simulation-tooltip-section">
                <Row label="Speed:">{Math.round(scaleKmh(train.speed, SCALES[train.scale ?? 'n-scale'].ratio))} km/h</Row>
                <Row label="Now:" tone={train.crashed ? 'crashed' : undefined}>{status}</Row>
            </div>
            {!train.crashed && <Hint>{train.stopped ? 'Click to start it' : 'Click to stop it'}</Hint>}
        </>
    );
}

function EdgeTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'edge' }> }) {
    const { edge, startNode, endNode } = element;
    const part = getPartById(edge.partId);
    const g = part?.geometry;
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon"><TrainTrack size={14} /></span>
                <span>{part?.name ?? 'Track'}</span>
            </div>
            <div className="simulation-tooltip-section">
                {part && <Row label="Maker:">{trackSystemName(part.brand)}{part.productCode ? ` ${part.productCode}` : ''}</Row>}
                {g?.type === 'curve'
                    ? <Row label="Curve:">R{g.radius} mm, {g.angle}°</Row>
                    : <Row label="Length:">{Math.round(edge.length)} mm</Row>}
                <Raised height={(heightOf(startNode) + heightOf(endNode)) / 2} />
            </div>
        </>
    );
}

function NodeTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'node' }> }) {
    const { node } = element;
    const title = node.bumper ? 'Buffer stop' : isOpenEnd(node) ? 'Open end' : 'Joint';
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon"><Circle size={14} /></span>
                <span>{title}</span>
            </div>
            <div className="simulation-tooltip-section">
                <Raised height={heightOf(node)} />
                {isOpenEnd(node) && <Row label="Track:">ends here</Row>}
                {!node.bumper && !isOpenEnd(node) && <Row label="Joins:">{node.connections.length} pieces</Row>}
            </div>
        </>
    );
}

function SwitchTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'switch' }> }) {
    const { node } = element;
    const edges = useTrackStore(s => s.edges);
    const nodes = useTrackStore(s => s.nodes);
    const trains = useSimulationStore(s => s.trains);
    const part = getPartById(edges[node.switchBranches?.[0] ?? node.connections[0]]?.partId ?? '');
    const locked = pointsOccupied(node.id, trains, edges, nodes);
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon"><GitBranch size={14} /></span>
                <span>{part?.name ?? 'Points'}</span>
            </div>
            <div className="simulation-tooltip-section">
                <Row label="Set for:" tone={node.switchState === 0 ? 'active' : undefined}>
                    {node.switchState === 0 ? 'the main line' : 'the branch'}
                </Row>
                {locked && <Row label="Locked:" tone="crashed">a train is on them</Row>}
            </div>
            <Hint>{locked ? 'They move once the train is off them' : 'Click to throw them'}</Hint>
        </>
    );
}

function SensorTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'sensor' }> }) {
    const { sensor } = element;
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon"><Radio size={14} /></span>
                <span>Sensor</span>
            </div>
            <div className="simulation-tooltip-section">
                <Row label="Now:" tone={sensor.state === 'on' ? 'active' : 'inactive'}>
                    {sensor.state === 'on' ? 'a train is over it' : 'clear'}
                </Row>
                <Row label="Length:">{Math.round(sensor.length)} mm</Row>
            </div>
        </>
    );
}

function SignalTooltipContent({ element }: { element: Extract<HoveredElement, { type: 'signal' }> }) {
    const { signal } = element;
    return (
        <>
            <div className="simulation-tooltip-header">
                <span className="icon"><TrafficCone size={14} /></span>
                <span>Signal</span>
            </div>
            <div className="simulation-tooltip-section">
                <Row label="Shows:" tone={signal.state === 'green' ? 'active' : 'crashed'}>
                    {signal.state === 'green' ? 'green: trains go' : 'red: trains stop'}
                </Row>
            </div>
            <Hint>Click to change it</Hint>
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

// Get initial desktop state outside component to avoid effect
function getInitialDesktopState(): boolean {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function SimulationTooltip({ screenX, screenY, worldX, worldY }: SimulationTooltipProps) {
    const [isDesktop, setIsDesktop] = useState(getInitialDesktopState);
    const isSimulating = useIsSimulating();

    // Subscribe to media query changes (setState only in callback, not synchronously)
    useEffect(() => {
        const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

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
            role="tooltip"
            data-testid="simulation-tooltip"
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
