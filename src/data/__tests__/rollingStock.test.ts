/**
 * The trains are real or flagged generic: a real train names its maker, a
 * source and the boxes it comes in, and every train a box holds is a known
 * train of the box's own maker and scale.
 */

import { describe, it, expect } from 'vitest';
import { ROLLING_STOCK, getRollingStock } from '../rollingStock';
import { getAllSets, getSetById } from '../sets';

describe('rolling stock', () => {
    it('has unique ids', () => {
        const ids = ROLLING_STOCK.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(ROLLING_STOCK.map(s => [s.id, s] as const))('%s is either a real train, cited, or a generic model sold on its own', (_id, stock) => {
        if (stock.generic) {
            expect(stock.brand).toBeUndefined();
            expect(stock.comesIn).toBeUndefined();
            expect(stock.price).toBeGreaterThan(0);
            return;
        }
        expect(stock.brand, 'a real train names its maker').toBeDefined();
        expect(stock.referenceUrl, 'and where its details come from').toMatch(/^https:\/\//);
        // A real train comes in its boxes, each of them its maker's, of its scale, and listing it
        expect(stock.comesIn?.length, 'and the boxes it comes in').toBeGreaterThan(0);
        for (const setId of stock.comesIn ?? []) {
            const box = getSetById(setId);
            expect(box, `comes in unknown set ${setId}`).toBeDefined();
            expect(box!.brand).toBe(stock.brand);
            expect(box!.scale).toBe(stock.scale);
            expect(box!.rollingStock).toContain(stock.id);
        }
        // Only in a box: bought with the box
        expect(stock.price).toBeUndefined();
    });

    it.each(getAllSets().filter(s => s.rollingStock).map(s => [s.id, s] as const))('%s holds known trains of its own scale, that say they come in it', (_id, set) => {
        for (const stockId of set.rollingStock ?? []) {
            const stock = getRollingStock(stockId);
            expect(stock, `unknown train ${stockId}`).toBeDefined();
            expect(stock!.scale).toBe(set.scale);
            expect(stock!.comesIn).toContain(set.id);
        }
        // Its plans run its own train
        for (const plan of set.plans) {
            for (const train of plan.trains ?? []) {
                if (train.stock) expect(set.rollingStock).toContain(train.stock);
            }
        }
    });
});
