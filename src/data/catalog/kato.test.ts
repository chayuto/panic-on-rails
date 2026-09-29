/**
 * Kato Unitrack catalog facts, checked against Kato's own published figures
 * (2025 US Unitrack catalog, "Standards & Measurements").
 */

import { describe, it, expect } from 'vitest';
import './index';
import { getPartById, getPartsByBrand } from './registry';
import { getPartConnectors } from './helpers';

const connector = (partId: string, id: string) =>
    getPartConnectors(getPartById(partId)!).nodes.find(n => n.localId === id)!;

describe('Kato catalog', () => {
    it('every part is a real product: a Kato product code, or a documented unnumbered piece', () => {
        for (const part of getPartsByBrand('kato')) {
            if (part.productCode) {
                expect(part.productCode, part.id).toMatch(/^20-\d{3}$/);
                expect(part.id.startsWith(`kato-${part.productCode}`) || part.id === 'kato-20-092', part.id).toBe(true);
            } else {
                expect(part.description, `${part.id} needs to say where it comes from`).toMatch(/not sold on its own/);
            }
        }
    });

    it('roadbed is 25mm wide, and the road-crossing rerailer 69mm with its plates', () => {
        expect(getPartById('kato-20-000')!.width).toBe(25);
        expect(getPartById('kato-20-026')!.width).toBe(69);
    });

    it('bumpers A and B end in a buffer stop: one connector each', () => {
        for (const id of ['kato-20-046', 'kato-20-047']) {
            expect(getPartConnectors(getPartById(id)!).nodes.map(n => n.localId), id).toEqual(['A']);
        }
    });

    it('X15 crossings: both routes span the same 186mm, the diagonal ending ~24.9mm either side', () => {
        for (const [id, side] of [['kato-20-301', 1], ['kato-20-300', -1]] as const) {
            const a1 = connector(id, 'A1');
            const a2 = connector(id, 'A2');
            const b1 = connector(id, 'B1');
            const b2 = connector(id, 'B2');
            expect(a2.localPosition.x - a1.localPosition.x).toBeCloseTo(186, 6);
            // The diagonal's ends line up with the straight route's ends
            expect(Math.abs(b1.localPosition.x)).toBeCloseTo(93, 1);
            expect(Math.abs(b2.localPosition.x)).toBeCloseTo(93, 1);
            expect(b2.localPosition.y * Math.sign(b2.localPosition.x)).toBeCloseTo(side * 93 * Math.tan(Math.PI / 12), 1);
        }
    });

    it('#4 and #6 turnouts: 126mm and 186mm straight routes, 15° diverging routes', () => {
        expect(connector('kato-20-220', 'main').localPosition.x).toBe(126);
        expect(connector('kato-20-202', 'main').localPosition.x).toBe(186);
        // #6 branch ends near (185.8, 24.5); #4 near (124.5, 16.4)
        expect(connector('kato-20-203', 'branch').localPosition.x).toBeCloseTo(185.8, 1);
        expect(connector('kato-20-203', 'branch').localPosition.y).toBeCloseTo(24.5, 1);
        expect(connector('kato-20-221', 'branch').localPosition.x).toBeCloseTo(124.5, 1);
        expect(connector('kato-20-221', 'branch').localPosition.y).toBeCloseTo(16.4, 1);
    });
});
