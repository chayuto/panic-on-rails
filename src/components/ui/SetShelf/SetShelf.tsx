/**
 * SetShelf - the hobby-shop shelf of real boxed sets.
 *
 * Each box shows what's really inside (part numbers and quantities), the
 * layouts from its manual, and builds any of them on the table.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Package, X } from 'lucide-react';
import { getAllSets, type LayoutPlan, type TrackSet } from '../../../data/sets';
import { getPartById } from '../../../data/catalog';
import { useTrackStore } from '../../../stores/useTrackStore';
import { PlanPreview } from '../TrackPreview';
import { buildSetPlan } from './buildSetPlan';
import './SetShelf.css';

function partLabel(partId: string): { name: string; code?: string } {
    const part = getPartById(partId);
    return { name: part?.name ?? partId, code: part?.productCode };
}

function SetBox({ set, onBuild }: { set: TrackSet; onBuild: (plan: LayoutPlan) => void }) {
    const [planIndex, setPlanIndex] = useState(0);
    const plan = set.plans[planIndex] ?? set.plans[0];
    const pieceCount = set.contents.reduce((n, item) => n + item.qty, 0);

    return (
        <article className={`set-box set-box-${set.brand}`} data-testid={`set-box-${set.id}`}>
            <header className="set-box-lid">
                <span className="set-box-brand">{set.brand}</span>
                {set.badge && <span className="set-box-badge">{set.badge}</span>}
                <span className="set-box-code">{set.productCode}</span>
            </header>
            <h3 className="set-box-name">{set.name}</h3>
            <p className="set-box-description">{set.description}</p>

            <PlanPreview plan={plan} />

            {set.plans.length > 1 && (
                <div className="set-box-plans" role="tablist" aria-label="Layouts in the manual">
                    {set.plans.map((p, i) => (
                        <button
                            key={p.id}
                            role="tab"
                            aria-selected={i === planIndex}
                            className={i === planIndex ? 'active' : ''}
                            onClick={() => setPlanIndex(i)}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}
            {plan.description && <p className="set-box-plan-description">{plan.description}</p>}

            <details className="set-box-contents">
                <summary>
                    In the box: {pieceCount} pieces
                    {set.footprint && <> · {set.footprint.width} × {set.footprint.depth} mm</>}
                </summary>
                <ul>
                    {set.contents.map(item => {
                        const { name, code } = partLabel(item.part);
                        return (
                            <li key={item.part}>
                                <span className="qty">{item.qty}×</span> {name}
                                {code && <span className="code"> {code}</span>}
                            </li>
                        );
                    })}
                    {set.accessories?.map(a => <li key={a} className="accessory">{a}</li>)}
                </ul>
                {set.extends && set.extends.length > 0 && (
                    <p className="set-box-extends">Builds on: {set.extends.map(id => getAllSets().find(s => s.id === id)?.badge ?? id).join(', ')}</p>
                )}
            </details>

            <button className="set-box-build" onClick={() => onBuild(plan)} data-testid={`set-build-${set.id}`}>
                Build this layout
            </button>
        </article>
    );
}

export function SetShelf({ onClose }: { onClose: () => void }) {
    const sets = getAllSets();
    const hasLayout = useTrackStore(s => Object.keys(s.edges).length > 0);
    const [pending, setPending] = useState<{ set: TrackSet; plan: LayoutPlan } | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dialogRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const build = (set: TrackSet, plan: LayoutPlan) => {
        buildSetPlan(set, plan);
        onClose();
    };

    const sections = [
        { title: 'Starter sets', sets: sets.filter(s => s.kind === 'starter') },
        { title: 'Expansion sets', sets: sets.filter(s => s.kind === 'expansion') },
    ].filter(section => section.sets.length > 0);

    return (
        <div className="set-shelf-overlay" onClick={onClose}>
            <div
                className="set-shelf"
                role="dialog"
                aria-modal="true"
                aria-label="Train sets"
                tabIndex={-1}
                ref={dialogRef}
                onClick={e => e.stopPropagation()}
                data-testid="set-shelf"
            >
                <header className="set-shelf-header">
                    <div>
                        <h2>Train sets</h2>
                        <p>Real boxes with the exact track inside. Pick one and build the layout from its manual.</p>
                    </div>
                    <button className="set-shelf-close" onClick={onClose} aria-label="Close" data-testid="set-shelf-close">
                        <X size={18} />
                    </button>
                </header>

                {pending && (
                    <div className="set-shelf-confirm" role="alertdialog" aria-label="Replace layout">
                        <span>Building <strong>{pending.set.badge ?? pending.set.productCode} · {pending.plan.name}</strong> replaces what's on the table. Undo brings it back.</span>
                        <button onClick={() => setPending(null)}>Cancel</button>
                        <button className="primary" onClick={() => build(pending.set, pending.plan)} data-testid="set-build-confirm">
                            Build
                        </button>
                    </div>
                )}

                <div className="set-shelf-body">
                    {sections.map(section => (
                        <section key={section.title}>
                            <h3 className="set-shelf-section">{section.title}</h3>
                            <div className="set-shelf-grid">
                                {section.sets.map(set => (
                                    <SetBox
                                        key={set.id}
                                        set={set}
                                        onBuild={plan => (hasLayout ? setPending({ set, plan }) : build(set, plan))}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Toolbar button that opens the shelf. */
export function SetShelfButton() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                title="Train sets"
                className="toolbar-btn-icon"
                data-testid="open-set-shelf"
            >
                <Package size={16} />
            </button>
            {open && createPortal(<SetShelf onClose={() => setOpen(false)} />, document.body)}
        </>
    );
}
