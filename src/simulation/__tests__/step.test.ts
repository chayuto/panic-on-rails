import { describe, it, expect } from 'vitest';
import { stepSimulation, createRng, type SimWorld } from '../step';
import { lineGraph, node, straightEdge, train, world } from './fixtures';

const ctx = (seed = 1) => ({ now: 1000, random: createRng(seed) });

describe('stepSimulation', () => {
    const graph = lineGraph(3, 100);

    it('does not mutate its input world', () => {
        const w = world({ ...graph, trains: { t: train('t', 'e0', 0) } });
        const frozen = JSON.stringify(w);
        stepSimulation(w, 0.5, ctx());
        expect(JSON.stringify(w)).toBe(frozen);
    });

    it('moves trains and emits traverse events', () => {
        const w = world({ ...graph, trains: { t: train('t', 'e0', 90) } });
        const { world: next, events } = stepSimulation(w, 0.2, ctx());
        expect(next.trains.t).toMatchObject({ currentEdgeId: 'e1', distanceAlongEdge: 10 });
        expect(events).toContainEqual({ type: 'traverse', trainId: 't', fromEdgeId: 'e0', toEdgeId: 'e1' });
    });

    it('stamps bounceTime from ctx.now and emits a bounce event', () => {
        const w = world({ ...graph, trains: { t: train('t', 'e2', 95) } });
        const { world: next, events } = stepSimulation(w, 0.1, ctx());
        expect(next.trains.t.bounceTime).toBe(1000);
        expect(events).toContainEqual({ type: 'bounce', trainId: 't', edgeId: 'e2' });
    });

    it('crashes both trains in a head-on collision and spawns debris', () => {
        const w = world({ ...graph, trains: { a: train('a', 'e1', 40, 1), b: train('b', 'e1', 60, -1) } });
        const { world: next, events } = stepSimulation(w, 0.05, ctx());
        expect(next.trains.a.crashed).toBe(true);
        expect(next.trains.b.crashed).toBe(true);
        expect(next.trains.a.speed).toBe(0);
        expect(next.crashedParts.length).toBeGreaterThan(0);
        const collisions = events.filter(e => e.type === 'collision');
        expect(collisions.map(c => c.type === 'collision' && c.trainId).sort()).toEqual(['a', 'b']);
    });

    it('crashed trains stay put', () => {
        const w = world({ ...graph, trains: { a: { ...train('a', 'e1', 40), crashed: true, speed: 0 } } });
        const { world: next } = stepSimulation(w, 1, ctx());
        expect(next.trains.a.distanceAlongEdge).toBe(40);
    });

    it('is deterministic for the same seed', () => {
        const w = world({ ...graph, trains: { a: train('a', 'e1', 40, 1), b: train('b', 'e1', 60, -1) } });
        const r1 = stepSimulation(w, 0.05, ctx(7));
        const r2 = stepSimulation(w, 0.05, ctx(7));
        const strip = (r: typeof r1) => r.world.crashedParts.map(({ id: _id, ...rest }) => rest);
        expect(strip(r1)).toEqual(strip(r2));
    });

    describe('sensors and wires', () => {
        // in —→ S ─main→ m, S ─branch→ b; sensor on `in` wired to the switch
        const e = {
            in: straightEdge('in', 'a', 'S', 0, 100),
            main: straightEdge('main', 'S', 'm', 100, 100),
            branch: straightEdge('branch', 'S', 'b', 100, 100),
        };
        const n = {
            a: node('a', 0, ['in']),
            S: node('S', 100, ['in', 'main', 'branch'], { type: 'switch' as const, switchState: 0 as const, switchBranches: ['main', 'branch'] as [string, string] }),
            m: node('m', 200, ['main']),
            b: node('b', 200, ['branch']),
        };
        const base = (action: 'toggle' | 'set_main' | 'set_branch'): SimWorld => world({
            edges: e, nodes: n,
            trains: { t: train('t', 'in', 40) },
            sensors: { s1: { id: 's1', edgeId: 'in', position: 50, length: 30, state: 'off' } },
            wires: { w1: { id: 'w1', sourceType: 'sensor', sourceId: 's1', targetType: 'switch', targetId: 'S', action, triggerOn: 'rising' } },
        });

        it('a sensor wired to a switch flips it when a train arrives', () => {
            const { world: next, events } = stepSimulation(base('toggle'), 0.01, ctx());
            expect(next.sensors.s1.state).toBe('on');
            expect(next.nodes.S.switchState).toBe(1);
            expect(events).toContainEqual({ type: 'switch', nodeId: 'S', switchState: 1 });
        });

        it('set_main on a switch already on main is a no-op', () => {
            const { world: next, events } = stepSimulation(base('set_main'), 0.01, ctx());
            expect(next.nodes.S.switchState).toBe(0);
            expect(events.some(ev => ev.type === 'switch')).toBe(false);
        });

        it('the flipped switch routes the same train onto the branch', () => {
            let w = base('set_branch');
            for (let i = 0; i < 100; i++) w = stepSimulation(w, 1 / 60, ctx()).world;
            expect(w.trains.t.currentEdgeId).toBe('branch');
        });
    });

    describe('train control', () => {
        it('a train stopped by the player does not move', () => {
            const w = world({ ...graph, trains: { t: { ...train('t', 'e0', 10), stopped: true } } });
            expect(stepSimulation(w, 1, ctx()).world.trains.t.distanceAlongEdge).toBe(10);
        });

        it('a red signal holds a train, then releases it on green', () => {
            const sig = { id: 's', nodeId: 'n1', state: 'red' as const, offset: { x: 0, y: 0 } };
            let w = world({ ...graph, trains: { t: train('t', 'e0', 50) }, signals: { s: sig } });

            let r = stepSimulation(w, 1, ctx());
            expect(r.world.trains.t.heldAtSignal).toBe(true);
            expect(r.events).toContainEqual({ type: 'signal-hold', trainId: 't', edgeId: 'e0' });

            // Still red: stays put, no repeated hold event
            r = stepSimulation(r.world, 1, ctx());
            expect(r.events.some(e => e.type === 'signal-hold')).toBe(false);
            const heldAt = r.world.trains.t.distanceAlongEdge;

            w = { ...r.world, signals: { s: { ...sig, state: 'green' } } };
            r = stepSimulation(w, 0.5, ctx());
            expect(r.world.trains.t.heldAtSignal).toBe(false);
            expect(r.events).toContainEqual({ type: 'signal-release', trainId: 't', edgeId: expect.any(String) });
            expect(r.world.trains.t.currentEdgeId !== 'e0' || r.world.trains.t.distanceAlongEdge > heldAt).toBe(true);
        });

        it('a train held at a signal is hit by a train behind it', () => {
            const sig = { id: 's', nodeId: 'n2', state: 'red' as const, offset: { x: 0, y: 0 } };
            let w = world({ ...graph, trains: { a: train('a', 'e1', 70), b: train('b', 'e1', 0) }, signals: { s: sig } });
            for (let i = 0; i < 120; i++) w = stepSimulation(w, 1 / 60, ctx()).world;
            expect(w.trains.a.crashed && w.trains.b.crashed).toBe(true);
        });
    });
});

