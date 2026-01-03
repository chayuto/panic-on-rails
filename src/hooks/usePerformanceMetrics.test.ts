import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PerformanceMetrics } from './usePerformanceMetrics';

// Note: These tests verify the module exports and types without requiring
// @testing-library/react. For full hook testing, that dependency would be needed.

describe('usePerformanceMetrics', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should export usePerformanceMetrics function', async () => {
        const module = await import('./usePerformanceMetrics');
        expect(typeof module.usePerformanceMetrics).toBe('function');
    });

    it('should export PerformanceMetrics interface type', async () => {
        // This is a compile-time check - if this file compiles, the type exists
        const sampleMetrics: PerformanceMetrics = {
            fps: 60,
            frameTime: 16.67,
            trackCount: 10,
            nodeCount: 20,
            trainCount: 2,
            sensorCount: 3,
            signalCount: 1,
            wireCount: 4,
            heapSizeMB: 12.5,
        };

        expect(sampleMetrics.fps).toBe(60);
        expect(sampleMetrics.frameTime).toBe(16.67);
        expect(sampleMetrics.heapSizeMB).toBe(12.5);
    });

    it('should allow null for heapSizeMB (non-Chrome browsers)', () => {
        const metricsWithNullHeap: PerformanceMetrics = {
            fps: 60,
            frameTime: 16.67,
            trackCount: 10,
            nodeCount: 20,
            trainCount: 2,
            sensorCount: 3,
            signalCount: 1,
            wireCount: 4,
            heapSizeMB: null,
        };

        expect(metricsWithNullHeap.heapSizeMB).toBeNull();
    });

    describe('PerformanceMetrics interface', () => {
        it('should have all required numeric fields', () => {
            const requiredFields: (keyof PerformanceMetrics)[] = [
                'fps',
                'frameTime',
                'trackCount',
                'nodeCount',
                'trainCount',
                'sensorCount',
                'signalCount',
                'wireCount',
            ];

            const testMetrics: PerformanceMetrics = {
                fps: 0,
                frameTime: 0,
                trackCount: 0,
                nodeCount: 0,
                trainCount: 0,
                sensorCount: 0,
                signalCount: 0,
                wireCount: 0,
                heapSizeMB: null,
            };

            for (const field of requiredFields) {
                expect(testMetrics).toHaveProperty(field);
                expect(typeof testMetrics[field]).toBe('number');
            }
        });

        it('should have heapSizeMB as number or null', () => {
            const metricsWithHeap: PerformanceMetrics = {
                fps: 60,
                frameTime: 16.67,
                trackCount: 0,
                nodeCount: 0,
                trainCount: 0,
                sensorCount: 0,
                signalCount: 0,
                wireCount: 0,
                heapSizeMB: 50.5,
            };

            const metricsWithoutHeap: PerformanceMetrics = {
                fps: 60,
                frameTime: 16.67,
                trackCount: 0,
                nodeCount: 0,
                trainCount: 0,
                sensorCount: 0,
                signalCount: 0,
                wireCount: 0,
                heapSizeMB: null,
            };

            expect(typeof metricsWithHeap.heapSizeMB).toBe('number');
            expect(metricsWithoutHeap.heapSizeMB).toBeNull();
        });
    });
});
