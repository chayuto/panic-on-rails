/**
 * Viewport Culling Tests (R14)
 */

import { describe, it, expect } from 'vitest';
import { isBoundsInViewport, getEdgeBounds, Viewport } from '../viewportCulling';
import { TrackEdge } from '../../types';

describe('viewportCulling', () => {
    // Mock viewport: 800x600 screen, no zoom, pan at 0,0
    const mockViewport: Viewport = {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        scale: 1,
    };

    describe('isBoundsInViewport', () => {
        it('should return true when bounds are fully inside viewport', () => {
            const bounds = { minX: 100, minY: 100, maxX: 200, maxY: 200 };
            expect(isBoundsInViewport(bounds, mockViewport)).toBe(true);
        });

        it('should return true when bounds partially overlap viewport', () => {
            const bounds = { minX: -50, minY: 100, maxX: 50, maxY: 200 };
            expect(isBoundsInViewport(bounds, mockViewport)).toBe(true);
        });

        it('should return false when bounds are fully outside viewport', () => {
            const bounds = { minX: 1000, minY: 100, maxX: 1100, maxY: 200 };
            expect(isBoundsInViewport(bounds, mockViewport)).toBe(false);
        });

        it('should handle scaled viewports', () => {
            // Zoomed out (0.5x), so world view is larger (1600x1200)
            const scaledViewport: Viewport = { ...mockViewport, scale: 0.5 };
            const bounds = { minX: 1000, minY: 100, maxX: 1100, maxY: 200 };
            // At 1x, minX 1000 is > 800 (out). At 0.5x, max world X is 1600 (in).
            expect(isBoundsInViewport(bounds, scaledViewport)).toBe(true);
        });

        it('should handle panned viewports', () => {
            // Panned right by 1000px (stage x is -1000)
            const pannedViewport: Viewport = { ...mockViewport, x: -1000 };
            const bounds = { minX: 1000, minY: 100, maxX: 1100, maxY: 200 };
            // World View X range: 1000 to 1800
            expect(isBoundsInViewport(bounds, pannedViewport)).toBe(true);
        });

        it('should respect margin', () => {
            const bounds = { minX: 810, minY: 100, maxX: 900, maxY: 200 };
            // Default margin (50) makes logic check up to 850. 
            // 810 >= 850? No. Wait. 
            // World Max X = 800 + 50 = 850.
            // Bounds Min X = 810. 
            // Overlap condition: Not (Min > Max).
            // 810 > 850 is False. So it overlaps.
            expect(isBoundsInViewport(bounds, mockViewport, 50)).toBe(true);

            // With 0 margin
            // World Max X = 800.
            // Bounds Min X = 810.
            // 810 > 800 is True. So it DOES NOT overlap (returns false).
            expect(isBoundsInViewport(bounds, mockViewport, 0)).toBe(false);
        });
    });

    describe('getEdgeBounds', () => {
        it('should calculate bounds for straight track', () => {
            const edge: TrackEdge = {
                id: '1',
                startNodeId: 'a',
                endNodeId: 'b',
                geometry: {
                    type: 'straight',
                    start: { x: 100, y: 100 },
                    end: { x: 200, y: 100 },
                },
            } as unknown as TrackEdge;

            const bounds = getEdgeBounds(edge);
            expect(bounds.minX).toBeLessThan(100); // Padding
            expect(bounds.maxX).toBeGreaterThan(200);
            expect(bounds.minY).toBeLessThan(100);
            expect(bounds.maxY).toBeGreaterThan(100);
        });

        it('should calculate bounds for arc track', () => {
            const edge: TrackEdge = {
                id: '2',
                startNodeId: 'c',
                endNodeId: 'd',
                geometry: {
                    type: 'arc',
                    center: { x: 100, y: 100 },
                    radius: 50,
                    startAngle: 0,
                    endAngle: 90,
                },
            } as unknown as TrackEdge;

            const bounds = getEdgeBounds(edge);
            // Center +/- radius
            expect(bounds.minX).toBeLessThan(50); // 100 - 50 = 50 - padding
            expect(bounds.maxX).toBeGreaterThan(150); // 100 + 50 = 150 + padding
        });
    });
});
