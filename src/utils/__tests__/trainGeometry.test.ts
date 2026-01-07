/**
 * Unit Tests for Train Geometry Utilities
 * 
 * Tests pure geometry calculations for train positioning.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getPositionOnEdge,
    getRotationOnEdge,
    getBounceScale,
    lightenColor,
    BOUNCE_DURATION,
} from '../trainGeometry';
import type { TrackEdge } from '../../types';

// ===========================
// Test Fixtures
// ===========================

/** Create a straight edge from (0,0) to (100,0) */
function createStraightEdge(length = 100): TrackEdge {
    return {
        id: 'test-edge-1',
        startNodeId: 'node-start',
        endNodeId: 'node-end',
        partId: 'test-part',
        length,
        geometry: {
            type: 'straight',
            start: { x: 0, y: 0 },
            end: { x: length, y: 0 },
        },
    };
}

/** Create an arc edge (90° CCW arc, radius 100) */
function createArcEdge(): TrackEdge {
    return {
        id: 'test-arc-edge',
        startNodeId: 'node-start',
        endNodeId: 'node-end',
        partId: 'test-part',
        length: 157, // ~quarter circle circumference
        geometry: {
            type: 'arc',
            center: { x: 0, y: 100 },
            radius: 100,
            startAngle: 270, // Starting at bottom (pointing up)
            endAngle: 360,   // Ending at right (pointing right)
        },
    };
}



// ===========================
// getPositionOnEdge Tests
// ===========================

describe('getPositionOnEdge', () => {
    describe('straight edge', () => {
        const edge = createStraightEdge(100);

        it('returns start position at distance 0', () => {
            const pos = getPositionOnEdge(edge, 0);
            expect(pos.x).toBeCloseTo(0);
            expect(pos.y).toBeCloseTo(0);
        });

        it('returns end position at full distance', () => {
            const pos = getPositionOnEdge(edge, 100);
            expect(pos.x).toBeCloseTo(100);
            expect(pos.y).toBeCloseTo(0);
        });

        it('returns midpoint at half distance', () => {
            const pos = getPositionOnEdge(edge, 50);
            expect(pos.x).toBeCloseTo(50);
            expect(pos.y).toBeCloseTo(0);
        });

        it('clamps negative distance to start', () => {
            const pos = getPositionOnEdge(edge, -10);
            expect(pos.x).toBeCloseTo(0);
            expect(pos.y).toBeCloseTo(0);
        });

        it('clamps distance beyond edge to end', () => {
            const pos = getPositionOnEdge(edge, 150);
            expect(pos.x).toBeCloseTo(100);
            expect(pos.y).toBeCloseTo(0);
        });
    });

    describe('diagonal straight edge', () => {
        const diagonalEdge: TrackEdge = {
            id: 'diag',
            startNodeId: 'a',
            endNodeId: 'b',
            partId: 'test',
            length: 100,
            geometry: {
                type: 'straight',
                start: { x: 0, y: 0 },
                end: { x: 60, y: 80 }, // 3-4-5 triangle scaled
            },
        };

        it('calculates position along diagonal', () => {
            const pos = getPositionOnEdge(diagonalEdge, 50);
            expect(pos.x).toBeCloseTo(30);
            expect(pos.y).toBeCloseTo(40);
        });
    });

    describe('arc edge', () => {
        const arcEdge = createArcEdge();

        it('returns start position at distance 0', () => {
            const pos = getPositionOnEdge(arcEdge, 0);
            // At 270°, position is at center + radius in negative Y direction
            // center is (0, 100), radius 100, so position is (0, 0)
            expect(pos.x).toBeCloseTo(0, 0);
            expect(pos.y).toBeCloseTo(0, 0);
        });

        it('returns end position at full distance', () => {
            const pos = getPositionOnEdge(arcEdge, arcEdge.length);
            // At 360°, position is at center + radius in positive X direction
            // center is (0, 100), radius 100, so position is (100, 100)
            expect(pos.x).toBeCloseTo(100, 0);
            expect(pos.y).toBeCloseTo(100, 0);
        });

        it('returns point on arc at midpoint', () => {
            const pos = getPositionOnEdge(arcEdge, arcEdge.length / 2);
            // At 315° (midpoint of 270-360), using trig:
            // x = 0 + 100 * cos(315°) ≈ 70.7
            // y = 100 + 100 * sin(315°) ≈ 29.3
            expect(pos.x).toBeCloseTo(70.7, 0);
            expect(pos.y).toBeCloseTo(29.3, 0);
        });
    });
});

// ===========================
// getRotationOnEdge Tests
// ===========================

describe('getRotationOnEdge', () => {
    describe('horizontal straight edge (0°)', () => {
        const edge = createStraightEdge(100);

        it('returns 0° when moving forward', () => {
            const rot = getRotationOnEdge(edge, 50, 1);
            expect(rot).toBeCloseTo(0);
        });

        it('returns 180° when moving backward', () => {
            const rot = getRotationOnEdge(edge, 50, -1);
            expect(rot).toBeCloseTo(180);
        });
    });

    describe('vertical straight edge (90°)', () => {
        const verticalEdge: TrackEdge = {
            id: 'vert',
            startNodeId: 'a',
            endNodeId: 'b',
            partId: 'test',
            length: 100,
            geometry: {
                type: 'straight',
                start: { x: 0, y: 0 },
                end: { x: 0, y: 100 },
            },
        };

        it('returns 90° when moving forward (down)', () => {
            const rot = getRotationOnEdge(verticalEdge, 50, 1);
            expect(rot).toBeCloseTo(90);
        });

        it('returns 270° when moving backward (up)', () => {
            const rot = getRotationOnEdge(verticalEdge, 50, -1);
            expect(rot).toBeCloseTo(270);
        });
    });

    describe('arc edge', () => {
        const arcEdge = createArcEdge();

        it('returns tangent angle at start', () => {
            const rot = getRotationOnEdge(arcEdge, 0, 1);
            // At 270°, tangent is perpendicular: 270 + 90 = 360 = 0°
            // For CCW arc moving forward, no flip needed
            expect(Math.abs(rot % 360)).toBeLessThan(1);
        });

        it('returns tangent angle at end', () => {
            const rot = getRotationOnEdge(arcEdge, arcEdge.length, 1);
            // At 360°, tangent is 360 + 90 = 450 = 90°
            expect(rot % 360).toBeCloseTo(90, 0);
        });
    });
});

// ===========================
// getBounceScale Tests
// ===========================

describe('getBounceScale', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns scale (1, 1) when bounceTime is undefined', () => {
        const scale = getBounceScale(undefined);
        expect(scale.scaleX).toBe(1);
        expect(scale.scaleY).toBe(1);
    });

    it('returns scale (1, 1) when bounce is complete', () => {
        // Set current time to 1000ms
        vi.setSystemTime(1000);
        // Bounce started at 0ms (elapsed = 1000ms > BOUNCE_DURATION)
        const scale = getBounceScale(0);
        expect(scale.scaleX).toBe(1);
        expect(scale.scaleY).toBe(1);
    });

    it('returns squashed scale at start of bounce', () => {
        vi.setSystemTime(100);
        // Bounce just started (elapsed ≈ 0)
        const scale = getBounceScale(100);
        // At t=0, should have max squash (scaleX > 1, scaleY < 1)
        expect(scale.scaleX).toBeGreaterThan(1);
        expect(scale.scaleY).toBeLessThan(1);
    });

    it('maintains scaleX + scaleY = 2 (volume conservation)', () => {
        vi.setSystemTime(200);
        const scale = getBounceScale(100);
        // Volume conservation: squash in one direction = stretch in other
        expect(scale.scaleX + scale.scaleY).toBeCloseTo(2, 1);
    });
});

// ===========================
// lightenColor Tests
// ===========================

describe('lightenColor', () => {
    it('lightens black to gray at 50%', () => {
        const result = lightenColor('#000000', 50);
        expect(result).toBe('#808080'); // Gray
    });

    it('returns white at 100%', () => {
        const result = lightenColor('#000000', 100);
        expect(result).toBe('#ffffff');
    });

    it('returns same color at 0%', () => {
        const result = lightenColor('#ff0000', 0);
        expect(result).toBe('#ff0000');
    });

    it('lightens red correctly', () => {
        const result = lightenColor('#ff0000', 50);
        // Red channel stays at 255, others go to 128
        expect(result).toBe('#ff8080');
    });

    it('handles colors without # prefix', () => {
        const result = lightenColor('0000ff', 50);
        expect(result).toBe('#8080ff');
    });

    it('handles already light colors', () => {
        const result = lightenColor('#cccccc', 50);
        // (204 + (255-204)*0.5) = 204 + 25.5 = 230 = e6
        expect(result).toBe('#e6e6e6');
    });
});

// ===========================
// BOUNCE_DURATION Constant
// ===========================

describe('BOUNCE_DURATION', () => {
    it('is 300ms', () => {
        expect(BOUNCE_DURATION).toBe(300);
    });
});
