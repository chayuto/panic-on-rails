/**
 * The shopping list: what's on the table, as real products to buy. For a
 * planner it's the bill of materials for a real layout; in collection mode
 * it also says what the player owns already.
 */

import { getPartById } from './catalog';
import { getAllSets } from './sets';
import type { PartCounts } from './collection';
import type { PartBrand } from './catalog/types';

export interface ShoppingLine {
    partId: string;
    brand: PartBrand;
    /** The maker's product number; missing for pieces that only come in boxes */
    productCode?: string;
    name: string;
    /** On the table */
    qty: number;
    /** In the collection */
    have: number;
    toBuy: number;
    /** Price of one, US cents, when the piece is sold on its own */
    unitPrice?: number;
    /** For pieces not sold on their own: the boxes that have them ("V4 20-863") */
    comesIn?: string[];
}

export interface ShoppingList {
    lines: ShoppingLine[];
    pieces: number;
    /** What the pieces still to buy cost, US cents (pieces only sold in boxes excluded) */
    cost: number;
}

/** The boxes a piece comes in, named as on the shelf. */
function boxesWith(partId: string): string[] {
    return getAllSets()
        .filter(set => set.contents.some(item => item.part === partId))
        .map(set => (set.badge && set.badge !== set.productCode ? `${set.badge} ${set.productCode}` : set.productCode));
}

/** The shopping list for `placed` pieces, given what the collection holds. */
export function shoppingList(placed: PartCounts, inventory: PartCounts = {}): ShoppingList {
    const lines: ShoppingLine[] = Object.entries(placed)
        .filter(([, qty]) => qty > 0)
        .map(([partId, qty]) => {
            const part = getPartById(partId);
            const have = inventory[partId] ?? 0;
            const sold = !!part?.productCode;
            return {
                partId,
                brand: part?.brand ?? 'generic',
                ...(part?.productCode && { productCode: part.productCode }),
                name: part?.name ?? partId,
                qty,
                have,
                toBuy: Math.max(0, qty - have),
                ...(sold && part && { unitPrice: part.cost }),
                ...(!sold && { comesIn: boxesWith(partId) }),
            };
        })
        // By maker; product numbers in order, then pieces that only come in boxes
        .sort((a, b) => a.brand.localeCompare(b.brand)
            || Number(!a.productCode) - Number(!b.productCode)
            || (a.productCode ?? '').localeCompare(b.productCode ?? '', undefined, { numeric: true })
            || a.name.localeCompare(b.name));

    return {
        lines,
        pieces: lines.reduce((n, l) => n + l.qty, 0),
        cost: lines.reduce((sum, l) => sum + l.toBuy * (l.unitPrice ?? 0), 0),
    };
}

const cents = (c: number) => (c / 100).toFixed(2);

/** The list as CSV, for a spreadsheet or a shop's order form. */
export function shoppingListCsv(list: ShoppingList): string {
    const quote = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const rows = [['Brand', 'Product code', 'Name', 'On the layout', 'Owned', 'To buy', 'Unit price (USD)', 'Subtotal (USD)', 'Comes in']];
    for (const l of list.lines) {
        rows.push([
            l.brand, l.productCode ?? '', l.name, String(l.qty), String(l.have), String(l.toBuy),
            l.unitPrice !== undefined ? cents(l.unitPrice) : '',
            l.unitPrice !== undefined ? cents(l.unitPrice * l.toBuy) : '',
            l.comesIn?.join('; ') ?? '',
        ]);
    }
    return rows.map(r => r.map(quote).join(',')).join('\n') + '\n';
}

/** The list as plain text, to paste into a message or a note. */
export function shoppingListText(list: ShoppingList): string {
    const out = [`Shopping list: ${list.pieces} pieces, $${cents(list.cost)} to buy`];
    let brand = '';
    for (const l of list.lines) {
        if (l.brand !== brand) {
            brand = l.brand;
            out.push('', brand);
        }
        const buy = l.toBuy < l.qty ? ` (${l.toBuy} to buy)` : '';
        const where = l.comesIn ? ` [only in ${l.comesIn.join(', ')}]` : '';
        out.push(`  ${(l.productCode ?? '—').padEnd(8)} ${l.name} ×${l.qty}${buy}${where}`);
    }
    return out.join('\n') + '\n';
}
