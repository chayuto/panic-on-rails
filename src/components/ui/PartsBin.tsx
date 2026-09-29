import { useCallback } from 'react';
import { useEditorStore } from '../../stores/useEditorStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useShopStore } from '../../stores/useShopStore';
import { useInventory, usePiecesLeft } from '../../hooks/useCollection';
import { getPartsByScale, partCategory } from '../../data/catalog';
import type { PartCategory } from '../../data/catalog/types';
import type { PartDefinition } from '../../types';
import { PartPreview } from './TrackPreview';
import { SCALES, SCALE_ORDER } from '../../config/scales';

/**
 * Renders a single draggable part card. `left` (collection mode) is how
 * many pieces are still in the box; at zero the card can't be dragged.
 */
function PartCard({ part, left }: { part: PartDefinition; left?: number }) {
    const startDrag = useEditorStore(s => s.startDrag);
    const empty = left !== undefined && left <= 0;

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
            className={`part-card${empty ? ' empty' : ''}`}
            draggable={!empty}
            onDragStart={empty ? undefined : handleDragStart}
            title={part.description ? `${part.name} — ${part.description}` : part.name}
            data-testid={`part-card-${part.id}`}
            aria-disabled={empty}
        >
            {left !== undefined && (
                <span className="part-left" data-testid={`part-left-${part.id}`} title="Pieces left in your collection">
                    ×{left}
                </span>
            )}
            <PartPreview part={part} />
            <span className="part-label">{part.name}</span>
            {part.productCode && <span className="part-code">{part.productCode}</span>}
        </div>
    );
}

/** Every scale the catalog has track for. */
const SYSTEMS = SCALE_ORDER.filter(scale => getPartsByScale(scale).length > 0);

/**
 * System tab selector (N-Scale / H0 / Wooden...)
 */
function SystemTabs() {
    const selectedSystem = useEditorStore(s => s.selectedSystem);
    const setSelectedSystem = useEditorStore(s => s.setSelectedSystem);

    return (
        <div className="system-tabs">
            {SYSTEMS.map(scale => (
                <button
                    key={scale}
                    className={`system-tab ${selectedSystem === scale ? 'active' : ''}`}
                    onClick={() => setSelectedSystem(scale)}
                >
                    {SCALES[scale].label}
                </button>
            ))}
        </div>
    );
}

/** Build with your collection, or with unlimited parts. */
function ModeSwitch() {
    const mode = useCollectionStore(s => s.mode);
    const setMode = useCollectionStore(s => s.setMode);
    return (
        <div className="mode-switch" role="radiogroup" aria-label="Parts">
            <button
                role="radio"
                aria-checked={mode === 'collection'}
                className={mode === 'collection' ? 'active' : ''}
                onClick={() => setMode('collection')}
                data-testid="mode-collection"
                title="Build with the pieces you own; running trains earns hobby money"
            >
                My collection
            </button>
            <button
                role="radio"
                aria-checked={mode === 'free'}
                className={mode === 'free' ? 'active' : ''}
                onClick={() => setMode('free')}
                data-testid="mode-free"
                title="Every part, unlimited: plan a real layout"
            >
                Free build
            </button>
        </div>
    );
}

/** Bin sections, in the order a modeler reaches for them. */
const PART_SECTIONS: { title: string; category: PartCategory }[] = [
    { title: 'Straights', category: 'straight' },
    { title: 'Curves', category: 'curve' },
    { title: 'Turnouts', category: 'turnout' },
    { title: 'Crossings & crossovers', category: 'crossing' },
    { title: 'Buffer stops', category: 'bumper' },
];

/**
 * Parts Bin sidebar - displays draggable track parts
 */
export function PartsBin() {
    const selectedSystem = useEditorStore(s => s.selectedSystem);
    const mode = useCollectionStore(s => s.mode);
    const openShop = useShopStore(s => s.openShop);
    const inventory = useInventory();
    const left = usePiecesLeft();
    const inCollection = mode === 'collection';

    // In collection mode the bin shows what you own
    const parts = getPartsByScale(selectedSystem).filter(p => !inCollection || (inventory[p.id] ?? 0) > 0);

    const sections = PART_SECTIONS
        .map(section => ({ ...section, parts: parts.filter(p => partCategory(p) === section.category) }))
        .filter(section => section.parts.length > 0);

    return (
        <aside className="parts-bin" data-testid="parts-bin">
            <div className="parts-bin-header">
                <h2>Parts</h2>
            </div>

            <ModeSwitch />
            <SystemTabs />

            <div className="parts-bin-content">
                {inCollection && sections.length === 0 && (
                    <div className="parts-bin-empty" data-testid="parts-bin-empty">
                        <p>No {SCALES[selectedSystem].label} track in your collection yet.</p>
                        <button onClick={() => openShop('sets')}>Visit the hobby shop</button>
                    </div>
                )}
                {sections.map(section => (
                    <section className="part-section" key={section.title}>
                        <h3>{section.title}</h3>
                        <div className="part-grid">
                            {section.parts.map(part => (
                                <PartCard key={part.id} part={part} left={inCollection ? left[part.id] ?? 0 : undefined} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </aside>
    );
}
