import { describe, it, expect } from 'vitest';
import { getPartById, getPartsByScale, calculateArcLength, ALL_PARTS } from './catalog';

describe('Part Catalog', () => {
    describe('getPartById', () => {
        it('should return Kato straight track by ID', () => {
            const part = getPartById('kato-20-000');
            expect(part).toBeDefined();
            expect(part?.name).toBe('Straight 248mm');
            expect(part?.geometry.type).toBe('straight');
        });

        it('should return Wooden curve by ID', () => {
            const part = getPartById('wooden-curve-large');
            expect(part).toBeDefined();
            expect(part?.brand).toBe('brio');
            expect(part?.scale).toBe('wooden');
        });

        it('should return undefined for unknown ID', () => {
            const part = getPartById('unknown-part');
            expect(part).toBeUndefined();
        });
    });

    describe('getPartsByScale', () => {
        it('should filter N-Scale parts', () => {
            const parts = getPartsByScale('n-scale');
            expect(parts.length).toBeGreaterThan(0);
            expect(parts.every(p => p.scale === 'n-scale')).toBe(true);
        });

        it('should filter Wooden parts', () => {
            const parts = getPartsByScale('wooden');
            expect(parts.length).toBeGreaterThan(0);
            expect(parts.every(p => p.scale === 'wooden')).toBe(true);
        });
    });

    describe('calculateArcLength', () => {
        it('should calculate arc length for 90 degree curve', () => {
            const length = calculateArcLength(100, 90);
            // Expected: 100 * (90 * PI / 180) = 100 * PI/2 ≈ 157.08
            expect(length).toBeCloseTo(157.08, 1);
        });

        it('should calculate arc length for 45 degree curve', () => {
            const length = calculateArcLength(200, 45);
            // Expected: 200 * (45 * PI / 180) = 200 * PI/4 ≈ 157.08
            expect(length).toBeCloseTo(157.08, 1);
        });
    });

    describe('ALL_PARTS', () => {
        it('should contain both Kato and Wooden parts', () => {
            const hasKato = ALL_PARTS.some(p => p.brand === 'kato');
            const hasBrio = ALL_PARTS.some(p => p.brand === 'brio');
            expect(hasKato).toBe(true);
            expect(hasBrio).toBe(true);
        });
    });
});
