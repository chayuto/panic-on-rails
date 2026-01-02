/**
 * Tests for JSON Parts Catalog Loader
 */

import { describe, it, expect } from 'vitest';
import { parsePartsCatalog, parseCatalogWithMeta } from './loader';

describe('Catalog Loader', () => {
    describe('parsePartsCatalog', () => {
        it('should parse valid straight part', () => {
            const input = {
                version: 1,
                brand: 'kato',
                scale: 'n-scale',
                parts: [{ id: 'test-1', name: 'Test Straight', type: 'straight', length: 100 }]
            };

            const result = parsePartsCatalog(input);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('test-1');
            expect(result[0].name).toBe('Test Straight');
            expect(result[0].brand).toBe('kato');
            expect(result[0].scale).toBe('n-scale');
            expect(result[0].geometry.type).toBe('straight');
            if (result[0].geometry.type === 'straight') {
                expect(result[0].geometry.length).toBe(100);
            }
        });

        it('should calculate default cost for straight (2x length, min $2)', () => {
            const input = {
                version: 1,
                brand: 'kato',
                scale: 'n-scale',
                parts: [{ id: 'test-1', name: 'Test', type: 'straight', length: 248 }]
            };

            const result = parsePartsCatalog(input);
            expect(result[0].cost).toBe(496); // 248 * 2
        });

        it('should use explicit cost when provided', () => {
            const input = {
                version: 1,
                brand: 'kato',
                scale: 'n-scale',
                parts: [{ id: 'test-1', name: 'Test', type: 'straight', length: 248, cost: 999 }]
            };

            const result = parsePartsCatalog(input);
            expect(result[0].cost).toBe(999);
        });

        it('should parse curved part with arc-based cost', () => {
            const input = {
                version: 1,
                brand: 'kato',
                scale: 'n-scale',
                parts: [{ id: 'curve-1', name: 'Curve', type: 'curve', radius: 249, angle: 45 }]
            };

            const result = parsePartsCatalog(input);

            expect(result[0].geometry.type).toBe('curve');
            expect(result[0].cost).toBeGreaterThan(300);
        });

        it('should parse switch part', () => {
            const input = {
                version: 1,
                brand: 'kato',
                scale: 'n-scale',
                parts: [{
                    id: 'switch-1',
                    name: 'Turnout',
                    type: 'switch',
                    mainLength: 248,
                    branchLength: 186,
                    branchAngle: 15,
                    branchDirection: 'left'
                }]
            };

            const result = parsePartsCatalog(input);

            expect(result[0].geometry.type).toBe('switch');
            expect(result[0].cost).toBe(1500); // default switch cost
        });

        it('should throw on invalid JSON with missing required field', () => {
            const input = {
                version: 1,
                brand: 'kato',
                scale: 'n-scale',
                parts: [{ id: 'test', type: 'straight' }] // missing name and length
            };

            expect(() => parsePartsCatalog(input)).toThrow();
        });

        it('should throw on invalid part type', () => {
            const input = {
                version: 1,
                brand: 'kato',
                scale: 'n-scale',
                parts: [{ id: 'test', name: 'Test', type: 'invalid' }]
            };

            expect(() => parsePartsCatalog(input)).toThrow();
        });

        it('should throw on empty parts array', () => {
            const input = {
                version: 1,
                brand: 'kato',
                scale: 'n-scale',
                parts: []
            };

            expect(() => parsePartsCatalog(input)).toThrow();
        });

        it('should parse multiple parts', () => {
            const input = {
                version: 1,
                brand: 'brio',
                scale: 'wooden',
                parts: [
                    { id: 'test-1', name: 'Straight', type: 'straight', length: 100 },
                    { id: 'test-2', name: 'Curve', type: 'curve', radius: 180, angle: 45 }
                ]
            };

            const result = parsePartsCatalog(input);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('test-1');
            expect(result[1].id).toBe('test-2');
            expect(result[0].brand).toBe('brio');
            expect(result[1].brand).toBe('brio');
        });
    });

    describe('parseCatalogWithMeta', () => {
        it('should return brand and scale with parts', () => {
            const input = {
                version: 1,
                brand: 'brio',
                scale: 'wooden',
                parts: [{ id: 'test-1', name: 'Test', type: 'straight', length: 100 }]
            };

            const result = parseCatalogWithMeta(input);

            expect(result.brand).toBe('brio');
            expect(result.scale).toBe('wooden');
            expect(result.parts).toHaveLength(1);
        });
    });
});
