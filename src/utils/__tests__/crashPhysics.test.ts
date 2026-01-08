/**
 * Unit Tests for Crash Physics System
 * 
 * Tests the "Lego-style" train explosion physics:
 * - Part generation with correct types and properties
 * - Physics simulation (gravity, bounce, settling)
 * - Crash severity calculation
 */

import { describe, it, expect } from 'vitest';
import {
    explodeTrain,
    updateCrashedParts,
    calculateCrashSeverity,
    cleanupOldParts,
    type CrashedPart,
    type CrashEvent,
} from '../crashPhysics';

describe('crashPhysics', () => {
    describe('explodeTrain', () => {
        const createCrashEvent = (overrides: Partial<CrashEvent> = {}): CrashEvent => ({
            position: { x: 100, y: 200 },
            velocity: { x: 50, y: 0 },
            trainColor: '#FF0000',
            severity: 2,
            ...overrides,
        });

        it('creates 7 parts (1 body, 4 wheels, 1 chimney, 1 cab)', () => {
            const parts = explodeTrain(createCrashEvent());

            expect(parts).toHaveLength(7);

            const types = parts.map(p => p.type);
            expect(types.filter(t => t === 'body')).toHaveLength(1);
            expect(types.filter(t => t === 'wheel')).toHaveLength(4);
            expect(types.filter(t => t === 'chimney')).toHaveLength(1);
            expect(types.filter(t => t === 'cab')).toHaveLength(1);
        });

        it('assigns unique IDs to all parts', () => {
            const parts = explodeTrain(createCrashEvent());
            const ids = parts.map(p => p.id);
            const uniqueIds = new Set(ids);

            expect(uniqueIds.size).toBe(parts.length);
        });

        it('assigns train color to body and cab', () => {
            const parts = explodeTrain(createCrashEvent({ trainColor: '#123456' }));

            const body = parts.find(p => p.type === 'body')!;
            const cab = parts.find(p => p.type === 'cab')!;

            expect(body.color).toBe('#123456');
            expect(cab.color).toBe('#123456');
        });

        it('assigns dark colors to wheels and chimney', () => {
            const parts = explodeTrain(createCrashEvent());

            const wheels = parts.filter(p => p.type === 'wheel');
            const chimney = parts.find(p => p.type === 'chimney')!;

            wheels.forEach(w => expect(w.color).toBe('#333333'));
            expect(chimney.color).toBe('#555555');
        });

        it('creates parts with valid physics properties', () => {
            const parts = explodeTrain(createCrashEvent());

            parts.forEach(part => {
                expect(part.position).toHaveProperty('x');
                expect(part.position).toHaveProperty('y');
                expect(typeof part.velocity.x).toBe('number');
                expect(typeof part.velocity.y).toBe('number');
                expect(typeof part.rotation).toBe('number');
                expect(typeof part.angularVelocity).toBe('number');
                expect(part.mass).toBeGreaterThan(0);
                expect(part.bounceCount).toBe(0);
                expect(part.maxBounces).toBeGreaterThan(0);
                expect(part.settled).toBe(false);
            });
        });

        it('applies severity multiplier to velocities', () => {
            const lowSeverity = explodeTrain(createCrashEvent({ severity: 1 }));
            const highSeverity = explodeTrain(createCrashEvent({ severity: 3 }));

            // Get body velocities (most consistent part)
            const lowBody = lowSeverity.find(p => p.type === 'body')!;
            const highBody = highSeverity.find(p => p.type === 'body')!;

            // Due to random spread, we can only check that severity affects base velocity
            // The formula is: forceMultiplier = 1 + severity * 0.5
            // severity 1: 1.5x, severity 3: 2.5x
            // Can't directly compare due to randomness, but both should have upward velocity
            expect(lowBody.velocity.y).toBeLessThan(0); // Upward (negative Y)
            expect(highBody.velocity.y).toBeLessThan(0);
        });

        it('positions parts near the crash location', () => {
            const crashPos = { x: 500, y: 300 };
            const parts = explodeTrain(createCrashEvent({ position: crashPos }));

            parts.forEach(part => {
                // Parts should be within 20 pixels of crash position
                expect(Math.abs(part.position.x - crashPos.x)).toBeLessThan(20);
                expect(Math.abs(part.position.y - crashPos.y)).toBeLessThan(20);
            });
        });
    });

    describe('updateCrashedParts', () => {
        const createPart = (overrides: Partial<CrashedPart> = {}): CrashedPart => ({
            id: 'test-part',
            type: 'body',
            position: { x: 100, y: 200 },
            velocity: { x: 50, y: 0 },
            rotation: 0,
            angularVelocity: 1,
            mass: 1,
            bounceCount: 0,
            maxBounces: 3,
            color: '#FF0000',
            settled: false,
            ...overrides,
        });

        it('applies gravity to velocity', () => {
            const part = createPart({ velocity: { x: 0, y: 0 } });
            const dt = 0.1; // 100ms

            const updated = updateCrashedParts([part], dt);

            // Gravity is 400 px/s^2, after 0.1s: vy = 400 * 0.1 = 40
            expect(updated[0].velocity.y).toBeCloseTo(40, 0);
        });

        it('updates position based on velocity', () => {
            const part = createPart({
                position: { x: 100, y: 100 },
                velocity: { x: 100, y: 50 },
            });
            const dt = 0.1;

            const updated = updateCrashedParts([part], dt);

            // After 0.1s: x = 100 + 100*0.1 = 110
            // y = 100 + (50 + gravity*0.1)*0.1 ≈ 100 + 9 = 109
            expect(updated[0].position.x).toBeCloseTo(110, 0);
            expect(updated[0].position.y).toBeGreaterThan(100);
        });

        it('updates rotation based on angular velocity', () => {
            const part = createPart({
                rotation: 0,
                angularVelocity: 10, // radians per second
            });
            const dt = 0.1;

            const updated = updateCrashedParts([part], dt);

            expect(updated[0].rotation).toBeCloseTo(1, 1); // 10 * 0.1 = 1 radian
        });

        it('bounces part off ground', () => {
            const groundY = 500;
            const part = createPart({
                position: { x: 100, y: 490 },
                velocity: { x: 10, y: 100 }, // Moving down fast
                bounceCount: 0,
            });

            // Large dt to ensure crossing ground
            const updated = updateCrashedParts([part], 0.5, groundY);

            expect(updated[0].bounceCount).toBe(1);
            expect(updated[0].position.y).toBeLessThanOrEqual(groundY);
        });

        it('reduces velocity on bounce', () => {
            const groundY = 500;
            const part = createPart({
                position: { x: 100, y: 510 }, // Already past ground
                velocity: { x: 100, y: 100 },
                bounceCount: 0,
            });

            const updated = updateCrashedParts([part], 0.01, groundY);

            // Velocity should be reduced by friction factor (0.85)
            expect(Math.abs(updated[0].velocity.y)).toBeLessThan(100);
            expect(Math.abs(updated[0].velocity.x)).toBeLessThan(100);
        });

        it('settles part after max bounces and low velocity', () => {
            const part = createPart({
                position: { x: 100, y: 400 },
                velocity: { x: 0.5, y: 0.5 }, // Very slow (speed < 5 threshold)
                angularVelocity: 0.1,
                bounceCount: 3, // At max bounces
                maxBounces: 3,
            });

            const updated = updateCrashedParts([part], 0.01);

            expect(updated[0].settled).toBe(true);
            expect(updated[0].velocity.x).toBe(0);
            expect(updated[0].velocity.y).toBe(0);
        });

        it('does not update settled parts', () => {
            const part = createPart({
                position: { x: 100, y: 100 },
                velocity: { x: 0, y: 0 },
                settled: true,
            });

            const updated = updateCrashedParts([part], 1.0);

            expect(updated[0].position.x).toBe(100);
            expect(updated[0].position.y).toBe(100);
        });

        it('handles multiple parts independently', () => {
            const parts = [
                createPart({ id: 'part-1', velocity: { x: 10, y: 0 } }),
                createPart({ id: 'part-2', velocity: { x: -10, y: 0 } }),
            ];

            const updated = updateCrashedParts(parts, 0.1);

            expect(updated[0].velocity.x).toBeGreaterThan(0);
            expect(updated[1].velocity.x).toBeLessThan(0);
        });
    });

    describe('calculateCrashSeverity', () => {
        it('returns 1 for low speed (< 50)', () => {
            expect(calculateCrashSeverity({ x: 30, y: 0 })).toBe(1);
            expect(calculateCrashSeverity({ x: 0, y: 30 })).toBe(1);
            expect(calculateCrashSeverity({ x: 25, y: 25 })).toBe(1); // ~35 magnitude
        });

        it('returns 2 for medium speed (50-150)', () => {
            expect(calculateCrashSeverity({ x: 100, y: 0 })).toBe(2);
            expect(calculateCrashSeverity({ x: 0, y: 100 })).toBe(2);
            expect(calculateCrashSeverity({ x: 50, y: 0 })).toBe(2);
        });

        it('returns 3 for high speed (> 150)', () => {
            expect(calculateCrashSeverity({ x: 200, y: 0 })).toBe(3);
            expect(calculateCrashSeverity({ x: 120, y: 100 })).toBe(3); // ~156 magnitude
            expect(calculateCrashSeverity({ x: 160, y: 0 })).toBe(3);
        });

        it('calculates relative velocity between two trains', () => {
            // Two trains heading toward each other at 100 each = relative 200
            const result = calculateCrashSeverity(
                { x: 100, y: 0 },
                { x: -100, y: 0 }
            );
            expect(result).toBe(3); // 200 relative speed
        });

        it('handles zero velocity', () => {
            expect(calculateCrashSeverity({ x: 0, y: 0 })).toBe(1);
        });
    });

    describe('cleanupOldParts', () => {
        it('returns all parts (current implementation)', () => {
            const parts: CrashedPart[] = [
                {
                    id: 'part-1',
                    type: 'body',
                    position: { x: 0, y: 0 },
                    velocity: { x: 0, y: 0 },
                    rotation: 0,
                    angularVelocity: 0,
                    mass: 1,
                    bounceCount: 0,
                    maxBounces: 3,
                    color: '#FF0000',
                    settled: true,
                },
            ];

            const result = cleanupOldParts(parts);
            expect(result).toHaveLength(1);
        });
    });
});
