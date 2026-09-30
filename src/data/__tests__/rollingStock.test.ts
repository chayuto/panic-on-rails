/**
 * The trains are real or flagged generic: a real train names its maker, a
 * source and the boxes it comes in, and every train a box holds is a known
 * train of the box's own maker and scale.
 */

import { describe, it, expect } from 'vitest';
import { ROLLING_STOCK, carColorAt, carKindAt, coachesOf, facesBack, genericCarLengths, getRollingStock, trainLength, tractionOf } from '../rollingStock';
import { getAllSets, getSetById } from '../sets';
import { SCALES, sizeOf } from '../../config/scales';

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

    it.each(ROLLING_STOCK.map(s => [s.id, s] as const))('%s has cars as long as real railway vehicles, at its scale', (_id, stock) => {
        expect(stock.carLengths.length).toBeGreaterThan(0);
        for (const length of stock.carLengths) {
            // From a little tank engine or a four-wheel wagon to the longest coach, in metres
            const real = (length * SCALES[stock.scale].ratio) / 1000;
            expect(real).toBeGreaterThan(5);
            expect(real).toBeLessThan(27.5);
        }
        if (stock.carKinds) {
            expect(stock.carKinds).toHaveLength(stock.carLengths.length);
            expect(stock.carKinds[0]).toBe('loco');
        }
        if (stock.carColors) expect(stock.carColors, 'a livery for every car').toHaveLength(stock.carLengths.length);
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

describe('cars', () => {
    it('are the locomotive, then coaches, or a freight train\'s wagons, or what the model says', () => {
        expect(carKindAt({ stockId: 'diesel-passenger' }, 0)).toBe('loco');
        expect(carKindAt({ stockId: 'diesel-passenger' }, 2)).toBe('coach');
        expect(carKindAt({ stockId: 'kato-up-gevo-freight' }, 3)).toBe('wagon');
        // Hornby's set trains: a coach, then a wagon
        expect(carKindAt({ stockId: 'hornby-smokey-joe' }, 1)).toBe('coach');
        expect(carKindAt({ stockId: 'hornby-smokey-joe' }, 2)).toBe('wagon');
        // A free-build train with no model
        expect(carKindAt({}, 1)).toBe('coach');
    });

    it('of a free-build train are the generic diesel and its coaches, grown to the track\'s scale', () => {
        const diesel = getRollingStock('diesel-passenger')!;
        expect(genericCarLengths(3, 'n-scale')).toEqual(diesel.carLengths);
        expect(genericCarLengths(1, 'ho-scale')).toEqual([diesel.carLengths[0] * sizeOf('ho-scale')]);
        expect(genericCarLengths(0, undefined)).toHaveLength(1);
    });

    it('are led by the kind of locomotive the model has: Hornby\'s steam tank engines, a diesel unless said', () => {
        expect(tractionOf({ stockId: 'hornby-smokey-joe' })).toBe('steam-tank');
        expect(tractionOf({ stockId: 'oo-express' })).toBe('steam-tender');
        expect(tractionOf({ stockId: 'h0-passenger' })).toBe('electric');
        expect(tractionOf({ stockId: 'kato-up-gevo-freight' })).toBe('diesel');
        expect(tractionOf({})).toBe('diesel');
    });

    it('are painted in their own liveries where the model has them, else in the train\'s colour', () => {
        // Flying Scotsman's apple green engine pulls teak coaches
        expect(carColorAt({ stockId: 'hornby-flying-scotsman', color: '#000000' }, 0)).toBe('#4C8B2B');
        expect(carColorAt({ stockId: 'hornby-flying-scotsman', color: '#000000' }, 3)).toBe('#8A5A2B');
        expect(carColorAt({ stockId: 'hornby-smokey-joe', color: '#123456' }, 2)).toBe('#123456');
        expect(carColorAt({ color: '#ABCDEF' }, 1)).toBe('#ABCDEF');
    });

    it('face the way they go, but for a power car at the far end, and a locomotive pushing', () => {
        expect(facesBack('loco', 0, false)).toBe(false);
        // An HST's second power car faces away from the train
        expect(facesBack('loco', 2, false)).toBe(true);
        expect(carKindAt({ stockId: 'hornby-gwr-hst' }, 2)).toBe('loco');
        // Turned back, the first locomotive pushes, facing back, and the far one leads
        expect(facesBack('loco', 0, true)).toBe(true);
        expect(facesBack('loco', 2, true)).toBe(false);
        expect(facesBack('coach', 1, true)).toBe(false);
    });

    it('carry passengers in their coaches, not in a power car at the far end', () => {
        expect(coachesOf({ stockId: 'hornby-gwr-hst', carLengths: [233, 300, 233] })).toBe(1);
        expect(coachesOf({ stockId: 'hornby-flying-scotsman', carLengths: [293, 247, 247, 247] })).toBe(3);
    });

    it('add up to the train\'s length', () => {
        expect(trainLength({ carLengths: [100, 150, 150] })).toBe(400);
    });
});
