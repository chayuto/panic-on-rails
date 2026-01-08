/**
 * Tests for Catalog Helpers
 * 
 * Tests for computeConnectors() and calculateArcEndpoint()
 */

import { describe, it, expect } from 'vitest';
import { computeConnectors, calculateArcEndpoint, calculateArcLength } from './helpers';
import type { PartDefinition } from './types';

describe('calculateArcLength', () => {
    it('calculates arc length for 90° curve', () => {
        const length = calculateArcLength(100, 90);
        // Arc length = radius * angle in radians = 100 * (π/2) ≈ 157.08
        expect(length).toBeCloseTo(157.08, 1);
    });

    it('calculates arc length for 45° curve', () => {
        const length = calculateArcLength(180, 45);
        // Arc length = 180 * (π/4) ≈ 141.37
        expect(length).toBeCloseTo(141.37, 1);
    });
});

describe('calculateArcEndpoint', () => {
    it('calculates endpoint for 90° CCW arc', () => {
        // Start at origin, facing right (0°), 90° CCW sweep
        const result = calculateArcEndpoint(0, 0, 100, 90, 0);

        // CCW from 0° direction: center is to the left
        // After 90° CCW sweep, endpoint should be forward and to the left
        expect(result.position.x).toBeCloseTo(100, 1);
        expect(result.position.y).toBeCloseTo(100, 1);  // Based on actual arc
        expect(result.tangentDirection).toBeCloseTo(90, 1);
    });

    it('calculates endpoint for 90° CW arc', () => {
        // Start at origin, facing right (0°), 90° CW sweep
        const result = calculateArcEndpoint(0, 0, 100, -90, 0);

        // CW from 0° direction: center is to the right
        // After 90° CW sweep, endpoint should be forward and to the right
        expect(result.position.x).toBeCloseTo(100, 1);
        expect(result.position.y).toBeCloseTo(-100, 1);  // Based on actual arc
        expect(result.tangentDirection).toBeCloseTo(270, 1);
    });

    it('calculates endpoint for 15° left diverge (like Kato #4)', () => {
        // Simulating Kato #4 switch branch: R481, 15° left
        const result = calculateArcEndpoint(0, 0, 481, -15, 0);

        // Branch should be forward and to the left (negative Y in arc geometry)
        // The exact angle may not be exactly 15° due to arc vs chord difference
        expect(result.position.x).toBeGreaterThan(0);  // Forward
        expect(result.position.y).toBeLessThan(0);  // Left
    });
});

describe('computeConnectors', () => {
    describe('straight track', () => {
        it('returns two connectors for straight track', () => {
            const part: PartDefinition = {
                id: 'test-straight',
                name: 'Test Straight',
                brand: 'kato',
                scale: 'n-scale',
                geometry: { type: 'straight', length: 248 },
                cost: 500,
            };

            const connectors = computeConnectors(part);

            expect(connectors.nodes).toHaveLength(2);
            expect(connectors.nodes[0].localId).toBe('A');
            expect(connectors.nodes[1].localId).toBe('B');
            expect(connectors.primaryNodeId).toBe('A');

            // A at origin, B at end
            expect(connectors.nodes[0].localPosition).toEqual({ x: 0, y: 0 });
            expect(connectors.nodes[1].localPosition.x).toBe(248);
        });
    });

    describe('curved track', () => {
        it('returns two connectors for curve', () => {
            const part: PartDefinition = {
                id: 'test-curve',
                name: 'Test Curve',
                brand: 'kato',
                scale: 'n-scale',
                geometry: { type: 'curve', radius: 249, angle: 45 },
                cost: 500,
            };

            const connectors = computeConnectors(part);

            expect(connectors.nodes).toHaveLength(2);
            expect(connectors.nodes[0].localId).toBe('A');
            expect(connectors.nodes[1].localId).toBe('B');
        });
    });

    describe('switch with curved diverge', () => {
        it('calculates correct connectors for #4 turnout left', () => {
            const part: PartDefinition = {
                id: 'kato-20-220',
                name: '#4 Turnout Left',
                brand: 'kato',
                scale: 'n-scale',
                geometry: {
                    type: 'switch',
                    mainLength: 126,
                    branchRadius: 481,
                    branchAngle: 15,
                    branchDirection: 'left',
                },
                cost: 1500,
            };

            const connectors = computeConnectors(part);

            expect(connectors.nodes).toHaveLength(3);
            expect(connectors.nodes[0].localId).toBe('entry');
            expect(connectors.nodes[1].localId).toBe('main');
            expect(connectors.nodes[2].localId).toBe('branch');
            expect(connectors.primaryNodeId).toBe('entry');

            // Entry at origin
            expect(connectors.nodes[0].localPosition).toEqual({ x: 0, y: 0 });
            expect(connectors.nodes[0].localFacade).toBe(180);

            // Main at end of straight path
            expect(connectors.nodes[1].localPosition.x).toBe(126);
            expect(connectors.nodes[1].localPosition.y).toBe(0);
            expect(connectors.nodes[1].localFacade).toBe(0);

            // Branch should be at approximately 15° angle (negative Y for left)
            const branch = connectors.nodes[2];
            expect(branch.localPosition.y).toBeLessThan(0);  // Left = negative Y
            expect(branch.localFacade).toBe(-15);
        });

        it('calculates correct connectors for #6 turnout right', () => {
            const part: PartDefinition = {
                id: 'kato-20-203',
                name: '#6 Turnout Right',
                brand: 'kato',
                scale: 'n-scale',
                geometry: {
                    type: 'switch',
                    mainLength: 186,
                    branchRadius: 718,
                    branchAngle: 15,
                    branchDirection: 'right',
                },
                cost: 1500,
            };

            const connectors = computeConnectors(part);

            // Branch should be at positive Y for right
            const branch = connectors.nodes[2];
            expect(branch.localPosition.y).toBeGreaterThan(0);  // Right = positive Y
            expect(branch.localFacade).toBe(15);
        });
    });

    describe('switch with legacy branchLength', () => {
        it('falls back to straight diverge for legacy switch', () => {
            const part: PartDefinition = {
                id: 'wooden-switch',
                name: 'Wooden Switch',
                brand: 'brio',
                scale: 'wooden',
                geometry: {
                    type: 'switch',
                    mainLength: 108,
                    branchLength: 108,
                    branchAngle: 30,
                    branchDirection: 'left',
                },
                cost: 500,
            };

            const connectors = computeConnectors(part);

            expect(connectors.nodes).toHaveLength(3);

            // Branch calculated as straight line
            const branch = connectors.nodes[2];
            const expectedX = Math.cos(-30 * Math.PI / 180) * 108;
            const expectedY = Math.sin(-30 * Math.PI / 180) * 108;
            expect(branch.localPosition.x).toBeCloseTo(expectedX, 5);
            expect(branch.localPosition.y).toBeCloseTo(expectedY, 5);
        });
    });

    describe('wye turnout', () => {
        it('creates symmetric left/right connectors for wye', () => {
            const part: PartDefinition = {
                id: 'kato-20-222',
                name: '#2 Wye Turnout',
                brand: 'kato',
                scale: 'n-scale',
                geometry: {
                    type: 'switch',
                    mainLength: 126,
                    branchRadius: 481,
                    branchAngle: 15,
                    branchDirection: 'left',
                    isWye: true,
                },
                cost: 1500,
            };

            const connectors = computeConnectors(part);

            expect(connectors.nodes).toHaveLength(3);
            expect(connectors.nodes[0].localId).toBe('entry');
            expect(connectors.nodes[1].localId).toBe('left');
            expect(connectors.nodes[2].localId).toBe('right');

            // Left and right should be symmetric
            const left = connectors.nodes[1];
            const right = connectors.nodes[2];

            // Same X distance
            expect(left.localPosition.x).toBeCloseTo(right.localPosition.x, 5);

            // Opposite Y (symmetric)
            expect(left.localPosition.y).toBeCloseTo(-right.localPosition.y, 5);
        });
    });

    describe('crossing', () => {
        it('returns four connectors for crossing', () => {
            const part: PartDefinition = {
                id: 'test-crossing',
                name: 'Test Crossing',
                brand: 'kato',
                scale: 'n-scale',
                geometry: { type: 'crossing', length: 124, crossingAngle: 90 },
                cost: 2000,
            };

            const connectors = computeConnectors(part);

            expect(connectors.nodes).toHaveLength(4);
            expect(connectors.nodes.map(n => n.localId)).toEqual(['A1', 'A2', 'B1', 'B2']);
        });
    });
});
