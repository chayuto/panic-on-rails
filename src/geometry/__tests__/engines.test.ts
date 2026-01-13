import { describe, it, expect } from 'vitest';
import { StraightEngine } from '../engines/StraightEngine';
import { ArcEngine } from '../engines/ArcEngine';

describe('StraightEngine', () => {
    // Horizontal line from (0,0) to (100,0)
    const engine = new StraightEngine({
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 }
    });

    it('calculates length correctly', () => {
        expect(engine.getLength()).toBe(100);
    });

    it('calculates position at t', () => {
        expect(engine.getPositionAt(0)).toEqual({ x: 0, y: 0 });
        expect(engine.getPositionAt(0.5)).toEqual({ x: 50, y: 0 });
        expect(engine.getPositionAt(1)).toEqual({ x: 100, y: 0 });
    });

    it('calculates tangent (constant)', () => {
        expect(engine.getTangentAt(0)).toBe(0);
        expect(engine.getTangentAt(0.5)).toBe(0);
        expect(engine.getTangentAt(1)).toBe(0);
    });

    it('converts distance to parameter', () => {
        expect(engine.getParameterAtDistance(50)).toBe(0.5);
        expect(engine.getParameterAtDistance(0)).toBe(0);
        expect(engine.getParameterAtDistance(100)).toBe(1);
    });

    it('clamps inputs', () => {
        expect(engine.getPositionAt(-1)).toEqual({ x: 0, y: 0 });
        expect(engine.getPositionAt(2)).toEqual({ x: 100, y: 0 });
    });

    it('handles angled lines (45 degrees)', () => {
        const angledEngine = new StraightEngine({
            start: { x: 0, y: 0 },
            end: { x: 100, y: 100 }
        });
        expect(angledEngine.getLength()).toBeCloseTo(Math.sqrt(100*100 + 100*100));
        expect(angledEngine.getTangentAt(0)).toBe(45);
        expect(angledEngine.getPositionAt(0.5)).toEqual({ x: 50, y: 50 });
    });

    it('handles vertical lines (90 degrees)', () => {
        const verticalEngine = new StraightEngine({
            start: { x: 0, y: 0 },
            end: { x: 0, y: 100 }
        });
        expect(verticalEngine.getLength()).toBe(100);
        expect(verticalEngine.getTangentAt(0)).toBe(90);
    });

    it('handles reverse lines (180 degrees)', () => {
        const reverseEngine = new StraightEngine({
            start: { x: 100, y: 0 },
            end: { x: 0, y: 0 }
        });
        expect(reverseEngine.getLength()).toBe(100);
        expect(reverseEngine.getTangentAt(0)).toBe(180);
    });
});

describe('ArcEngine', () => {
    // 90-degree arc from (100,0) to (0,100) around origin (0,0)
    // Start angle 0, End angle 90
    const radius = 100;
    const engine = new ArcEngine({
        center: { x: 0, y: 0 },
        radius: 100,
        startAngle: 0,
        endAngle: 90
    });

    it('calculates length correctly', () => {
        const expectedLength = 2 * Math.PI * radius * (90 / 360);
        expect(engine.getLength()).toBeCloseTo(expectedLength);
    });

    it('calculates position at t', () => {
        // t=0 -> (100, 0)
        expect(engine.getPositionAt(0).x).toBeCloseTo(100);
        expect(engine.getPositionAt(0).y).toBeCloseTo(0);

        // t=1 -> (0, 100)
        expect(engine.getPositionAt(1).x).toBeCloseTo(0);
        expect(engine.getPositionAt(1).y).toBeCloseTo(100);

        // t=0.5 -> 45 degrees
        const midX = Math.cos(Math.PI / 4) * radius;
        const midY = Math.sin(Math.PI / 4) * radius;
        expect(engine.getPositionAt(0.5).x).toBeCloseTo(midX);
        expect(engine.getPositionAt(0.5).y).toBeCloseTo(midY);
    });

    it('calculates tangent', () => {
        // Tangent of Circle (CCW) is +90 deg from radius
        // At start (0 deg), radius is right (0), tangent is up (90) aka North (in standard math)
        // BUT remember SVG coords: Y down
        // Visual Clockwise is positive.
        // Wait, project constitution:
        // "Calculations: Radians are standard math (Counter Clockwise positive)"
        // "Visuals: Y is down, so 'Positive Angle' looks Clockwise"

        // Let's check the implementation logic in ArcEngine:
        // const tangentOffset = this.isCounterClockwise ? 90 : -90;
        // implementation uses standard Math.cos/sin

        // At t=0 (0 deg): Radius vector (1, 0). Tangent should be (0, 1) [Down] if +90
        // Let's verify expectations:
        // startAngle = 0. EndAngle = 90. sweep = +90.
        // In screen coords (Y down):
        // 0 deg = Right. 90 deg = Down.
        // So this is a CLOCKWISE arc visually.
        // But mathematically (Math.sin(90)), 90 is "Up" (-Y).

        // Project Constitution says:
        // "Visually: Positive angles rotate clockwise"
        // "Mathematically: This corresponds to standard counter-clockwise in a Y-up system"
        // THIS IS CONFUSING.
        // Let's rely on standard math:
        // If we use Math.cos(theta), Math.sin(theta):
        // theta=0 -> (1, 0)
        // theta=90 -> (0, 1) -> This is "Down" in Y-down system.

        // So start=0, end=90 IS a "Visual Clockwise" arc.
        // And `isCounterClockwise` calc is `sweep >= 0`. So it thinks it's CCW because 90 > 0.
        // So it adds +90 offset.
        // At t=0 (angle 0): tangent = 0 + 90 = 90.
        // 90 deg = Down.
        // If the train moves from (100,0) to (0,100), it is moving "Down and Left".
        // Tangent at start (100,0) should be Pointing towards (0,100)? No, at start it is purely vertical.
        // If circle is (0,0) with radius 100.
        // Point (100,0). To get to (0,100), you move primarily +Y.
        // So tangent 90 (Down) is correct!

        expect(engine.getTangentAt(0)).toBe(90);

        // At t=1 (angle 90): tangent = 90 + 90 = 180.
        // 180 deg = Left.
        // At (0,100), moving along circle, direction is indeed Left. Correct.
        expect(engine.getTangentAt(1)).toBe(180);
    });
});
