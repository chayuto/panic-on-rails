/**
 * Driving: throttle with momentum, braking for signals and buffer stops,
 * the direction lever, and derailing on a curve taken too fast.
 */

import { describe, it, expect } from 'vitest';
import { stepSimulation, type SimWorld, type SimEvent } from '../step';
import { approachSpeed, curveLimit, derailSpeed, DRIVING, scaleKmh, stoppingLimit } from '../driving';
import { SIGNAL_STOP_GAP } from '../movement';
import { lineGraph, train, world, node } from './fixtures';
import { SCALES, sizeOf } from '../../config/scales';
import type { EdgeId, TrackEdge } from '../../types';

const ctx = () => ({ now: 0, random: () => 0.5 });

/** Run `seconds` at 60 fps, collecting every event. */
function run(w: SimWorld, seconds: number): { world: SimWorld; events: SimEvent[]; speeds: number[] } {
    const events: SimEvent[] = [];
    const speeds: number[] = [];
    for (let i = 0; i < Math.round(seconds * 60); i++) {
        const r = stepSimulation(w, 1 / 60, ctx());
        w = r.world;
        events.push(...r.events);
        speeds.push(Object.values(w.trains)[0]?.speed ?? 0);
    }
    return { world: w, events, speeds };
}

describe('bigger scales', () => {
    const k = sizeOf('ho-scale');

    it('drive exactly like N, grown by the scale: every speed k times, at every distance k times', () => {
        expect(curveLimit(360 * k, k)).toBeCloseTo(curveLimit(360) * k, 9);
        expect(stoppingLimit(50 * k, 1 / 60, k)).toBeCloseTo(stoppingLimit(50, 1 / 60) * k, 9);
        expect(approachSpeed(100 * k, 200 * k, 0.5, k)).toBeCloseTo(approachSpeed(100, 200, 0.5) * k, 9);
    });

    it('read the same scale speed', () => {
        expect(scaleKmh(100 * k, SCALES['ho-scale'].ratio)).toBeCloseTo(scaleKmh(100), 9);
    });
});

describe('speed rules', () => {
    it('accelerates and brakes at the power pack rates', () => {
        expect(approachSpeed(100, 200, 0.5)).toBe(100 + DRIVING.ACCELERATION * 0.5);
        expect(approachSpeed(100, 0, 0.5)).toBe(100 - DRIVING.BRAKING * 0.5);
        expect(approachSpeed(100, 90, 1)).toBe(90);
    });

    it('lets a train brake to a stop from its stopping speed', () => {
        // v² = 2·a·d
        expect(stoppingLimit(50)).toBeCloseTo(Math.sqrt(2 * DRIVING.BRAKING * 50), 6);
        expect(stoppingLimit(0)).toBe(DRIVING.CREEP);
    });

    it('gives each curve a speed limit from its radius, and the M1 curve room for normal running', () => {
        expect(curveLimit(315)).toBeGreaterThan(DRIVING.DEFAULT_THROTTLE);
        expect(curveLimit(216)).toBeLessThan(curveLimit(315));
        expect(derailSpeed(315)).toBeCloseTo(curveLimit(315) * DRIVING.DERAIL_FACTOR, 6);
    });

    it('reads out scale speed: 100 mm/s is about 58 km/h in N scale', () => {
        expect(scaleKmh(100)).toBeCloseTo(57.6, 1);
    });
});

describe('driving (stepSimulation)', () => {
    it('follows the throttle up with momentum', () => {
        const graph = lineGraph(20, 248);
        const w = world({ ...graph, trains: { t: { ...train('t', 'e0', 0), throttle: 200 } } });
        const { speeds } = run(w, 2);
        const oneSecond = speeds[59];
        expect(oneSecond).toBeCloseTo(100 + DRIVING.ACCELERATION, 0);
        expect(speeds[speeds.length - 1]).toBe(200);
    });

    it('brakes smoothly for a red signal and stands at its stop line', () => {
        const graph = lineGraph(6, 248);
        const sig = { id: 's', nodeId: 'n3', state: 'red' as const, offset: { x: 0, y: 0 } };
        const w = world({ ...graph, trains: { t: train('t', 'e0', 0) }, signals: { s: sig } });
        const { world: end, speeds } = run(w, 12);
        const t = end.trains.t;
        expect(t.heldAtSignal).toBe(true);
        expect(t.currentEdgeId).toBe('e2');
        expect(t.distanceAlongEdge).toBeCloseTo(248 - SIGNAL_STOP_GAP, 3);
        // No slamming on: never slows faster than the service brake (plus the crawl)
        for (let i = 1; i < speeds.length; i++) {
            expect(speeds[i - 1] - speeds[i]).toBeLessThanOrEqual(DRIVING.BRAKING / 60 + DRIVING.CREEP + 1e-6);
        }
    });

    it('eases into a buffer stop, then heads back', () => {
        const graph = lineGraph(2, 248);
        const w = world({ ...graph, trains: { t: train('t', 'e1', 100) } });
        const { events, speeds, world: end } = run(w, 6);
        const bounceAt = events.findIndex(e => e.type === 'bounce');
        expect(bounceAt).toBeGreaterThanOrEqual(0);
        // Crawling when it reaches the end, then picking up speed the other way
        expect(Math.min(...speeds)).toBeLessThanOrEqual(DRIVING.CREEP);
        expect(end.trains.t.direction).toBe(-1);
        expect(end.trains.t.speed).toBeGreaterThan(50);
    });

    it('the direction lever brakes to a stop before reversing', () => {
        const graph = lineGraph(20, 248);
        const w = world({ ...graph, trains: { t: { ...train('t', 'e5', 100), reverseRequested: true } } });
        const first = stepSimulation(w, 1 / 60, ctx()).world.trains.t;
        expect(first.direction).toBe(1); // still rolling forward while braking
        const { world: end } = run(w, 3);
        expect(end.trains.t.direction).toBe(-1);
        expect(end.trains.t.reverseRequested).toBe(false);
        expect(end.trains.t.speed).toBeGreaterThan(0);
    });

    describe('on a curve', () => {
        /** A straight into a tight R216 curve. */
        function curveGraph() {
            const edges: Record<EdgeId, TrackEdge> = {
                s: {
                    id: 's', partId: 'kato-20-000', startNodeId: 'a', endNodeId: 'b',
                    geometry: { type: 'straight', start: { x: 0, y: 0 }, end: { x: 248, y: 0 } },
                    length: 248, intrinsicGeometry: { type: 'straight', length: 248 },
                },
                c: {
                    id: 'c', partId: 'kato-20-170', startNodeId: 'b', endNodeId: 'd',
                    geometry: { type: 'arc', center: { x: 248, y: 216 }, radius: 216, startAngle: 270, endAngle: 315 },
                    length: 216 * Math.PI / 4, intrinsicGeometry: { type: 'arc', radius: 216, sweepAngle: 45, direction: 'ccw' },
                },
            };
            const nodes = {
                a: node('a', 0, ['s']),
                b: node('b', 248, ['s', 'c']),
                d: { ...node('d', 400, ['c']), position: { x: 400, y: 60 } },
            };
            return { edges, nodes };
        }

        it('derails a train that takes it far too fast', () => {
            const w = world({ ...curveGraph(), trains: { t: { ...train('t', 's', 200, 1, 300), throttle: 300 } } });
            const { world: end, events } = run(w, 1);
            expect(end.trains.t.crashed).toBe(true);
            expect(events.some(e => e.type === 'derail')).toBe(true);
            expect(end.crashedParts.length).toBeGreaterThan(0);
        });

        it('lets a train through at a sensible speed', () => {
            const w = world({ ...curveGraph(), trains: { t: train('t', 's', 200) } });
            const { world: end, events } = run(w, 1);
            expect(end.trains.t.crashed).toBeFalsy();
            expect(events.some(e => e.type === 'derail')).toBe(false);
        });
    });
});
