/**
 * The shopping list: the layout on the table as real products, with what's
 * owned and what's left to buy. For planners, it's the bill of materials to
 * take to a hobby shop; it copies as text and downloads as CSV.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialogFocus } from '../../../hooks/useDialogFocus';
import { createPortal } from 'react-dom';
import { ClipboardList, Copy, Download, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useCollectionStore } from '../../../stores/useCollectionStore';
import { useInventory } from '../../../hooks/useCollection';
import { countPlacedPieces, formatMoney } from '../../../data/collection';
import { shoppingList, shoppingListCsv, shoppingListText, type ShoppingLine } from '../../../data/shoppingList';
import { trackSystemName } from '../../../data/brands';
import '../SetShelf/SetShelf.css';
import './ShoppingList.css';

export function ShoppingListButton() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                title="Shopping list: this layout as real products"
                className="toolbar-btn-icon"
                data-testid="open-shopping-list"
            >
                <ClipboardList size={16} />
            </button>
            {open && createPortal(<ShoppingListDialog onClose={() => setOpen(false)} />, document.body)}
        </>
    );
}

function ShoppingListDialog({ onClose }: { onClose: () => void }) {
    const edges = useTrackStore(s => s.edges);
    const inCollection = useCollectionStore(s => s.mode) === 'collection';
    const inventory = useInventory();
    const list = useMemo(
        () => shoppingList(countPlacedPieces(edges), inCollection ? inventory : {}),
        [edges, inventory, inCollection]
    );
    const [copied, setCopied] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    useDialogFocus(dialogRef);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const copy = async () => {
        await navigator.clipboard?.writeText(shoppingListText(list));
        setCopied(true);
    };
    const download = () => {
        saveAs(new Blob([shoppingListCsv(list)], { type: 'text/csv;charset=utf-8' }), 'shopping-list.csv');
    };

    // One group per track system, in list order
    const groups: { brand: string; lines: ShoppingLine[] }[] = [];
    for (const line of list.lines) {
        const last = groups[groups.length - 1];
        if (last?.brand === line.brand) last.lines.push(line);
        else groups.push({ brand: line.brand, lines: [line] });
    }

    return (
        <div className="set-shelf-overlay" onClick={onClose}>
            <div
                className="set-shelf shopping-list"
                role="dialog"
                aria-modal="true"
                aria-label="Shopping list"
                tabIndex={-1}
                ref={dialogRef}
                onClick={e => e.stopPropagation()}
                data-testid="shopping-list"
            >
                <header className="set-shelf-header">
                    <div>
                        <h2>Shopping list</h2>
                        <p>
                            The layout on the table as real products: {list.pieces} pieces
                            {inCollection
                                ? <>, <strong data-testid="shopping-list-cost">{formatMoney(list.cost)}</strong> for the ones you don't own yet.</>
                                : <>, <strong data-testid="shopping-list-cost">{formatMoney(list.cost)}</strong> at hobby-shop prices.</>}
                        </p>
                    </div>
                    <button className="set-shelf-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </header>

                {/* Focusable, so a long list scrolls from the keyboard */}
                <div className="set-shelf-body" tabIndex={0}>
                    {list.lines.length === 0 ? (
                        <p className="shopping-list-empty">Nothing on the table yet: build something first.</p>
                    ) : (
                        <table className="shopping-list-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Name</th>
                                    <th className="num">Qty</th>
                                    {inCollection && <th className="num">Owned</th>}
                                    {inCollection && <th className="num">To buy</th>}
                                    <th className="num">Each</th>
                                </tr>
                            </thead>
                            {groups.map(group => (
                                <tbody key={group.brand}>
                                    <tr className="shopping-list-brand">
                                        <th colSpan={inCollection ? 6 : 4}>{trackSystemName(group.lines[0].brand)}</th>
                                    </tr>
                                    {group.lines.map(line => (
                                        <tr key={line.partId} data-testid={`shopping-line-${line.partId}`}>
                                            <td className="code">{line.productCode ?? '—'}</td>
                                            <td>
                                                {line.name}
                                                {line.comesIn && (
                                                    <span className="shopping-list-note">
                                                        {line.comesIn.length > 0 ? `only in ${line.comesIn.join(', ')}` : 'not sold on its own'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="num">{line.qty}</td>
                                            {inCollection && <td className="num">{line.have}</td>}
                                            {inCollection && <td className="num">{line.toBuy}</td>}
                                            <td className="num">{line.unitPrice !== undefined ? formatMoney(line.unitPrice) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            ))}
                        </table>
                    )}
                </div>

                <footer className="shopping-list-actions">
                    <button onClick={copy} disabled={list.lines.length === 0} data-testid="shopping-list-copy">
                        <Copy size={14} /> {copied ? 'Copied' : 'Copy as text'}
                    </button>
                    <button onClick={download} disabled={list.lines.length === 0} data-testid="shopping-list-csv">
                        <Download size={14} /> Download CSV
                    </button>
                </footer>
            </div>
        </div>
    );
}
