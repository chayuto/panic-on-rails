/**
 * The shopping list: a layout's pieces as real products, with what's owned
 * and what's left to buy.
 */

import { describe, it, expect } from 'vitest';
import { shoppingList, shoppingListCsv, shoppingListText } from '../shoppingList';
import { getSetById, resolvePlan } from '../sets';
import { getPartById } from '../catalog';

const bomOf = (setId: string) => resolvePlan(getSetById(setId)!.plans[0]).billOfMaterials;

describe('shoppingList', () => {
    it('lists the M1 oval as Kato products, by product number', () => {
        const list = shoppingList(bomOf('kato-20-852'));
        expect(list.pieces).toBe(16);
        expect(list.lines.map(l => [l.productCode, l.qty])).toEqual([
            ['20-000', 4], ['20-020', 1], ['20-026', 1], ['20-040', 1], ['20-041', 1], ['20-120', 8],
        ]);
        // Nothing owned in free build: all of it to buy, at the shop's prices
        const cost = list.lines.reduce((sum, l) => sum + l.qty * getPartById(l.partId)!.cost, 0);
        expect(list.cost).toBe(cost);
    });

    it('takes off what the collection holds', () => {
        const list = shoppingList(bomOf('kato-20-852'), { 'kato-20-000': 3, 'kato-20-120': 8 });
        const straight = list.lines.find(l => l.productCode === '20-000')!;
        expect(straight).toMatchObject({ qty: 4, have: 3, toBuy: 1 });
        expect(list.lines.find(l => l.productCode === '20-120')!.toBuy).toBe(0);
    });

    it('names the boxes a piece comes in when it isn\'t sold on its own, and lists it last', () => {
        const lines = shoppingList(bomOf('kato-20-863')).lines;
        const cut = lines.find(l => l.partId === 'kato-s60l')!;
        expect(cut.productCode).toBeUndefined();
        expect(cut.unitPrice).toBeUndefined();
        expect(cut.comesIn).toContain('V4 20-863');
        expect(lines.slice(-2).map(l => l.partId).sort()).toEqual(['kato-s60l', 'kato-s60r']);
    });

    it('sorts brands apart and numbers numerically', () => {
        const list = shoppingList({ 'marklin-24188': 2, 'kato-20-120': 1, 'kato-20-000': 1, 'hornby-R600': 1 });
        expect(list.lines.map(l => l.brand)).toEqual(['hornby', 'kato', 'kato', 'marklin']);
        expect(list.lines.filter(l => l.brand === 'kato').map(l => l.productCode)).toEqual(['20-000', '20-120']);
    });
});

describe('exports', () => {
    const list = shoppingList(bomOf('kato-20-863'), { 'kato-20-000': 4 });

    it('writes CSV a spreadsheet can read', () => {
        const [header, ...rows] = shoppingListCsv(list).trim().split('\n');
        expect(header).toBe('Brand,Product code,Name,On the layout,Owned,To buy,Unit price (USD),Subtotal (USD),Comes in');
        expect(rows).toHaveLength(list.lines.length);
        // V4's plan includes the M1 oval: 8 of them, 4 owned, 4 to buy at $2.10
        expect(rows.find(r => r.includes(',20-000,'))).toBe('kato,20-000,Straight 248mm,8,4,4,2.10,8.40,');
        expect(rows.find(r => r.startsWith('kato,,Straight 60mm Left Cut'))).toMatch(/V4 20-863$/);
    });

    it('writes text to paste into a message', () => {
        const text = shoppingListText(list);
        expect(text).toMatch(/^Shopping list: \d+ pieces, \$\d+\.\d\d to buy/);
        expect(text).toContain('20-220   #4 Turnout Left ×1');
        expect(text).toContain('[only in V4 20-863]');
    });
});
