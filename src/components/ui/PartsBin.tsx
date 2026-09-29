import { useCallback } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { getPartsByScale } from '../../data/catalog';
import type { PartDefinition } from '../../types';
import { PartPreview } from './TrackPreview';

/**
 * Renders a single draggable part card
 */
function PartCard({ part }: { part: PartDefinition }) {
    const startDrag = useEditorStore(s => s.startDrag);

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

    return (
        <div
            className="part-card"
            draggable
            onDragStart={handleDragStart}
            title={part.description ? `${part.name} — ${part.description}` : part.name}
            data-testid={`part-card-${part.id}`}
        >
            <PartPreview part={part} />
            <span className="part-label">{part.name}</span>
            {part.productCode && <span className="part-code">{part.productCode}</span>}
        </div>
    );
}

/**
 * System tab selector (N-Scale / Wooden)
 */
function SystemTabs() {
    const selectedSystem = useEditorStore(s => s.selectedSystem);
    const setSelectedSystem = useEditorStore(s => s.setSelectedSystem);

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

/** Bin sections, in the order a modeler reaches for them. */
const PART_SECTIONS: { title: string; types: PartDefinition['geometry']['type'][] }[] = [
    { title: 'Straights', types: ['straight'] },
    { title: 'Curves', types: ['curve'] },
    { title: 'Turnouts', types: ['switch'] },
    { title: 'Crossings & crossovers', types: ['crossing', 'compound'] },
];

/**
 * Parts Bin sidebar - displays draggable track parts
 */
export function PartsBin() {
    const selectedSystem = useEditorStore(s => s.selectedSystem);

    const parts = getPartsByScale(selectedSystem);

    const sections = PART_SECTIONS
        .map(section => ({ ...section, parts: parts.filter(p => section.types.includes(p.geometry.type)) }))
        .filter(section => section.parts.length > 0);

    return (
        <aside className="parts-bin" data-testid="parts-bin">
            <div className="parts-bin-header">
                <h2>Parts</h2>
            </div>

            <SystemTabs />

            <div className="parts-bin-content">
                {sections.map(section => (
                    <section className="part-section" key={section.title}>
                        <h3>{section.title}</h3>
                        <div className="part-grid">
                            {section.parts.map(part => (
                                <PartCard key={part.id} part={part} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </aside>
    );
}
