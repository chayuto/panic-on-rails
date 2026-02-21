import { useCallback } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { getPartsByScale } from '../../data/catalog';
import type { PartDefinition } from '../../types';

/**
 * Renders a single draggable part card
 */
function PartCard({ part }: { part: PartDefinition }) {
    const { startDrag } = useEditorStore();

    const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('application/x-part-id', part.id);
        e.dataTransfer.effectAllowed = 'copy';
        startDrag(part.id);

        // Create a custom drag image (optional enhancement)
        const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
        const rect = e.currentTarget.getBoundingClientRect();

        // Fix: Explicitly set dimensions to match original element
        // otherwise it defaults to 100% width when appended to body
        dragImage.style.width = `${rect.width}px`;
        dragImage.style.height = `${rect.height}px`;
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.left = '-1000px';
        dragImage.style.opacity = '1'; // Browser handles drag transparency

        document.body.appendChild(dragImage);

        // Center the drag image cursor
        e.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2);

        setTimeout(() => document.body.removeChild(dragImage), 0);
    }, [part.id, startDrag]);

    // Render part geometry preview
    const renderPreview = () => {
        if (part.geometry.type === 'straight') {
            return (
                <svg viewBox="0 0 60 60" className="part-preview">
                    <line
                        x1="10" y1="30"
                        x2="50" y2="30"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                </svg>
            );
        } else if (part.geometry.type === 'switch') {
            // Switch/turnout preview - Y-shape
            return (
                <svg viewBox="0 0 60 60" className="part-preview">
                    {/* Main straight line */}
                    <line
                        x1="10" y1="30"
                        x2="50" y2="30"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    {/* Diverging branch */}
                    <line
                        x1="30" y1="30"
                        x2="50" y2="15"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.7"
                    />
                    {/* Switch indicator dot */}
                    <circle cx="30" cy="30" r="4" fill="#FFD93D" />
                </svg>
            );
        } else {
            // Curve
            return (
                <svg viewBox="0 0 60 60" className="part-preview">
                    <path
                        d="M 10 50 Q 10 10 50 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                </svg>
            );
        }
    };

    return (
        <div
            className="part-card"
            draggable
            onDragStart={handleDragStart}
            title={part.name}
            data-testid={`part-card-${part.id}`}
        >
            {renderPreview()}
            <span className="part-label">{part.name}</span>
        </div>
    );
}

/**
 * System tab selector (N-Scale / Wooden)
 */
function SystemTabs() {
    const { selectedSystem, setSelectedSystem } = useEditorStore();

    return (
        <div className="system-tabs">
            <button
                className={`system-tab ${selectedSystem === 'n-scale' ? 'active' : ''}`}
                onClick={() => setSelectedSystem('n-scale')}
            >
                N-Scale
            </button>
            <button
                className={`system-tab ${selectedSystem === 'wooden' ? 'active' : ''}`}
                onClick={() => setSelectedSystem('wooden')}
            >
                Wooden
            </button>
        </div>
    );
}

/**
 * Parts Bin sidebar - displays draggable track parts
 */
export function PartsBin() {
    const { selectedSystem } = useEditorStore();

    const parts = getPartsByScale(selectedSystem);

    // Group by geometry type
    const straights = parts.filter(p => p.geometry.type === 'straight');
    const curves = parts.filter(p => p.geometry.type === 'curve');
    const switches = parts.filter(p => p.geometry.type === 'switch');

    return (
        <aside className="parts-bin" data-testid="parts-bin">
            <div className="parts-bin-header">
                <h2>Parts</h2>
            </div>

            <SystemTabs />

            <div className="parts-bin-content">
                {straights.length > 0 && (
                    <section className="part-section">
                        <h3>Straights</h3>
                        <div className="part-grid">
                            {straights.map(part => (
                                <PartCard key={part.id} part={part} />
                            ))}
                        </div>
                    </section>
                )}

                {curves.length > 0 && (
                    <section className="part-section">
                        <h3>Curves</h3>
                        <div className="part-grid">
                            {curves.map(part => (
                                <PartCard key={part.id} part={part} />
                            ))}
                        </div>
                    </section>
                )}

                {switches.length > 0 && (
                    <section className="part-section">
                        <h3>Switches</h3>
                        <div className="part-grid">
                            {switches.map(part => (
                                <PartCard key={part.id} part={part} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </aside>
    );
}
