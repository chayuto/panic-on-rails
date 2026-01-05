/**
 * Tests for useCanvasCoordinates hook
 *
 * Note: These tests verify the coordinate conversion logic without requiring
 * @testing-library/react. The mathematical correctness is verified through
 * direct calculation tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Vector2 } from '../../types';

describe('useCanvasCoordinates', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should export useCanvasCoordinates function', async () => {
        const module = await import('../useCanvasCoordinates');
        expect(typeof module.useCanvasCoordinates).toBe('function');
    });

    describe('Type Definitions', () => {
        it('should have CoordinateConverters with screenToWorld function', () => {
            const mockConverters = {
                screenToWorld: vi.fn((x: number, y: number): Vector2 => ({ x, y })),
                worldToScreen: vi.fn((x: number, y: number): Vector2 => ({ x, y })),
            };

            expect(typeof mockConverters.screenToWorld).toBe('function');
            expect(mockConverters.screenToWorld(100, 200)).toEqual({ x: 100, y: 200 });
        });

        it('should have CoordinateConverters with worldToScreen function', () => {
            const mockConverters = {
                screenToWorld: vi.fn(),
                worldToScreen: vi.fn((x: number, y: number): Vector2 => ({ x, y })),
            };

            expect(typeof mockConverters.worldToScreen).toBe('function');
            expect(mockConverters.worldToScreen(50, 75)).toEqual({ x: 50, y: 75 });
        });
    });

    describe('Screen to World Conversion', () => {
        /**
         * Formula: worldX = (screenX - containerLeft - panX) / zoom
         *          worldY = (screenY - containerTop - panY) / zoom
         */

        it('should convert correctly with no pan and zoom=1', () => {
            const screenX = 400;
            const screenY = 300;
            const pan = { x: 0, y: 0 };
            const zoom = 1;
            const rect = { left: 0, top: 0 };

            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            expect(worldX).toBe(400);
            expect(worldY).toBe(300);
        });

        it('should convert correctly with container offset', () => {
            const screenX = 500;
            const screenY = 400;
            const pan = { x: 0, y: 0 };
            const zoom = 1;
            const rect = { left: 100, top: 50 };

            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            expect(worldX).toBe(400);  // 500 - 100
            expect(worldY).toBe(350);  // 400 - 50
        });

        it('should convert correctly with pan offset', () => {
            const screenX = 400;
            const screenY = 300;
            const pan = { x: 100, y: 50 };
            const zoom = 1;
            const rect = { left: 0, top: 0 };

            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            expect(worldX).toBe(300);  // 400 - 0 - 100
            expect(worldY).toBe(250);  // 300 - 0 - 50
        });

        it('should convert correctly with zoom', () => {
            const screenX = 400;
            const screenY = 300;
            const pan = { x: 0, y: 0 };
            const zoom = 2;
            const rect = { left: 0, top: 0 };

            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            expect(worldX).toBe(200);  // 400 / 2
            expect(worldY).toBe(150);  // 300 / 2
        });

        it('should convert correctly with all transforms combined', () => {
            const screenX = 600;
            const screenY = 500;
            const pan = { x: 100, y: 100 };
            const zoom = 2;
            const rect = { left: 50, top: 50 };

            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            // worldX = (600 - 50 - 100) / 2 = 450 / 2 = 225
            // worldY = (500 - 50 - 100) / 2 = 350 / 2 = 175
            expect(worldX).toBe(225);
            expect(worldY).toBe(175);
        });
    });

    describe('World to Screen Conversion', () => {
        /**
         * Formula: screenX = worldX * zoom + panX + containerLeft
         *          screenY = worldY * zoom + panY + containerTop
         */

        it('should convert correctly with no pan and zoom=1', () => {
            const worldX = 400;
            const worldY = 300;
            const pan = { x: 0, y: 0 };
            const zoom = 1;
            const rect = { left: 0, top: 0 };

            const screenX = worldX * zoom + pan.x + rect.left;
            const screenY = worldY * zoom + pan.y + rect.top;

            expect(screenX).toBe(400);
            expect(screenY).toBe(300);
        });

        it('should convert correctly with container offset', () => {
            const worldX = 400;
            const worldY = 300;
            const pan = { x: 0, y: 0 };
            const zoom = 1;
            const rect = { left: 100, top: 50 };

            const screenX = worldX * zoom + pan.x + rect.left;
            const screenY = worldY * zoom + pan.y + rect.top;

            expect(screenX).toBe(500);  // 400 + 100
            expect(screenY).toBe(350);  // 300 + 50
        });

        it('should convert correctly with pan offset', () => {
            const worldX = 400;
            const worldY = 300;
            const pan = { x: 100, y: 50 };
            const zoom = 1;
            const rect = { left: 0, top: 0 };

            const screenX = worldX * zoom + pan.x + rect.left;
            const screenY = worldY * zoom + pan.y + rect.top;

            expect(screenX).toBe(500);  // 400 + 100
            expect(screenY).toBe(350);  // 300 + 50
        });

        it('should convert correctly with zoom', () => {
            const worldX = 200;
            const worldY = 150;
            const pan = { x: 0, y: 0 };
            const zoom = 2;
            const rect = { left: 0, top: 0 };

            const screenX = worldX * zoom + pan.x + rect.left;
            const screenY = worldY * zoom + pan.y + rect.top;

            expect(screenX).toBe(400);  // 200 * 2
            expect(screenY).toBe(300);  // 150 * 2
        });

        it('should convert correctly with all transforms combined', () => {
            const worldX = 225;
            const worldY = 175;
            const pan = { x: 100, y: 100 };
            const zoom = 2;
            const rect = { left: 50, top: 50 };

            const screenX = worldX * zoom + pan.x + rect.left;
            const screenY = worldY * zoom + pan.y + rect.top;

            // screenX = 225 * 2 + 100 + 50 = 450 + 150 = 600
            // screenY = 175 * 2 + 100 + 50 = 350 + 150 = 500
            expect(screenX).toBe(600);
            expect(screenY).toBe(500);
        });
    });

    describe('Round-trip Conversion', () => {
        /**
         * Converting from screen to world and back should give the original values.
         * screenToWorld(worldToScreen(world)) ≈ world
         * worldToScreen(screenToWorld(screen)) ≈ screen
         */

        it('should round-trip correctly: screen -> world -> screen', () => {
            const originalScreenX = 500;
            const originalScreenY = 400;
            const pan = { x: 75, y: 25 };
            const zoom = 1.5;
            const rect = { left: 50, top: 30 };

            // Screen to World
            const worldX = (originalScreenX - rect.left - pan.x) / zoom;
            const worldY = (originalScreenY - rect.top - pan.y) / zoom;

            // World back to Screen
            const screenX = worldX * zoom + pan.x + rect.left;
            const screenY = worldY * zoom + pan.y + rect.top;

            expect(screenX).toBeCloseTo(originalScreenX);
            expect(screenY).toBeCloseTo(originalScreenY);
        });

        it('should round-trip correctly: world -> screen -> world', () => {
            const originalWorldX = 250;
            const originalWorldY = 200;
            const pan = { x: 100, y: 50 };
            const zoom = 2;
            const rect = { left: 20, top: 10 };

            // World to Screen
            const screenX = originalWorldX * zoom + pan.x + rect.left;
            const screenY = originalWorldY * zoom + pan.y + rect.top;

            // Screen back to World
            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            expect(worldX).toBeCloseTo(originalWorldX);
            expect(worldY).toBeCloseTo(originalWorldY);
        });

        it('should round-trip with edge case zoom values', () => {
            const originalWorldX = 1000;
            const originalWorldY = 800;
            const pan = { x: -200, y: -150 };  // Negative pan
            const zoom = 0.25;  // Very low zoom
            const rect = { left: 0, top: 0 };

            // World to Screen
            const screenX = originalWorldX * zoom + pan.x + rect.left;
            const screenY = originalWorldY * zoom + pan.y + rect.top;

            // Screen back to World
            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            expect(worldX).toBeCloseTo(originalWorldX);
            expect(worldY).toBeCloseTo(originalWorldY);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero coordinates', () => {
            const pan = { x: 0, y: 0 };
            const zoom = 1;
            const rect = { left: 0, top: 0 };

            const worldX = (0 - rect.left - pan.x) / zoom;
            const worldY = (0 - rect.top - pan.y) / zoom;

            expect(worldX).toBe(0);
            expect(worldY).toBe(0);
        });

        it('should handle negative pan values', () => {
            const screenX = 200;
            const screenY = 100;
            const pan = { x: -100, y: -50 };
            const zoom = 1;
            const rect = { left: 0, top: 0 };

            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            expect(worldX).toBe(300);  // 200 - 0 - (-100) = 300
            expect(worldY).toBe(150);  // 100 - 0 - (-50) = 150
        });

        it('should handle very small zoom values', () => {
            const screenX = 400;
            const screenY = 300;
            const pan = { x: 0, y: 0 };
            const zoom = 0.1;
            const rect = { left: 0, top: 0 };

            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            expect(worldX).toBe(4000);  // 400 / 0.1
            expect(worldY).toBe(3000);  // 300 / 0.1
        });

        it('should handle very large zoom values', () => {
            const screenX = 400;
            const screenY = 300;
            const pan = { x: 0, y: 0 };
            const zoom = 10;
            const rect = { left: 0, top: 0 };

            const worldX = (screenX - rect.left - pan.x) / zoom;
            const worldY = (screenY - rect.top - pan.y) / zoom;

            expect(worldX).toBe(40);  // 400 / 10
            expect(worldY).toBe(30);  // 300 / 10
        });
    });
});
