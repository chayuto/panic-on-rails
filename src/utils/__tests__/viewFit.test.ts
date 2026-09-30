import { describe, it, expect } from 'vitest';
import { fitViewToPoints, panToInclude } from '../viewFit';

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

describe('panToInclude', () => {
    const view = { zoom: 1, pan: { x: 0, y: 0 } };

    it('leaves the view alone when everything is comfortably in view', () => {
        expect(panToInclude([{ x: 500, y: 400 }], view, 1000, 800)).toBeNull();
        expect(panToInclude([], view, 1000, 800)).toBeNull();
    });

    it('pans just enough to bring an end off the right back inside the margin', () => {
        // At x=1100 the end is 160px past the right edge's 60px margin
        expect(panToInclude([{ x: 1100, y: 400 }], view, 1000, 800, 60)).toEqual({ x: -160, y: 0 });
    });

    it('works at any zoom, and in both directions', () => {
        const zoomed = { zoom: 0.5, pan: { x: 100, y: 100 } };
        // (-300, -300) is at screen (-50, -50): 110px short of the top-left margin
        expect(panToInclude([{ x: -300, y: -300 }], zoomed, 1000, 800, 60)).toEqual({ x: 210, y: 210 });
    });

    it('centres points too far apart to fit, rather than zooming', () => {
        // They span 4000px around x=1000; the viewport's centre is at 500
        const pan = panToInclude([{ x: -1000, y: 400 }, { x: 3000, y: 400 }], view, 1000, 800);
        expect(pan).toEqual({ x: -500, y: 0 });
    });
});
