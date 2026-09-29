import { describe, it, expect } from 'vitest';
import { fitViewToPoints } from '../viewFit';

const toScreen = (p: { x: number; y: number }, v: { zoom: number; pan: { x: number; y: number } }) =>
    ({ x: p.x * v.zoom + v.pan.x, y: p.y * v.zoom + v.pan.y });

describe('fitViewToPoints', () => {
    it('returns null for no points or an empty viewport', () => {
        expect(fitViewToPoints([], 800, 600)).toBeNull();
        expect(fitViewToPoints([{ x: 0, y: 0 }], 0, 600)).toBeNull();
    });

    it('zooms out so a wide layout fits inside the padding', () => {
        const pts = [{ x: 100, y: 400 }, { x: 1840, y: 367 }];
        const v = fitViewToPoints(pts, 1000, 600, 50)!;
        expect(v.zoom).toBeLessThan(1);
        for (const p of pts.map(q => toScreen(q, v))) {
            expect(p.x).toBeGreaterThanOrEqual(49.9);
            expect(p.x).toBeLessThanOrEqual(950.1);
        }
    });

    it('centres the layout', () => {
        const v = fitViewToPoints([{ x: 0, y: 0 }, { x: 200, y: 100 }], 800, 600)!;
        const c = toScreen({ x: 100, y: 50 }, v);
        expect(c.x).toBeCloseTo(400);
        expect(c.y).toBeCloseTo(300);
    });

    it('does not zoom in past maxZoom for small layouts', () => {
        expect(fitViewToPoints([{ x: 0, y: 0 }, { x: 10, y: 10 }], 800, 600)!.zoom).toBe(1);
    });
});
