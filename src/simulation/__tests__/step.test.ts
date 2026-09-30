import { describe, it, expect } from 'vitest';
import { stepSimulation, createRng, type SimWorld, type SimEvent } from '../step';
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

    it('a train that runs into a wreck crashes too; the wreck isn\'t wrecked again', () => {
        const wreck = { ...train('w', 'e1', 60, -1), crashed: true, crashTime: 5, speed: 0 };
        const w = world({ ...graph, trains: { w: wreck, t: train('t', 'e1', 50, 1) } });
        const { world: next, events } = stepSimulation(w, 0.05, ctx());
        expect(next.trains.t).toMatchObject({ crashed: true, speed: 0 });
        expect(next.trains.w).toBe(wreck);
        const collisions = events.filter(e => e.type === 'collision');
        expect(collisions).toEqual([expect.objectContaining({ trainId: 't', otherTrainIds: ['w'] })]);
        // The debris is the train's own, to sweep up with its wreck
        expect(next.crashedParts.length).toBeGreaterThan(0);
        expect(next.crashedParts.every(p => p.trainId === 't')).toBe(true);
    });

    it('a train crashes once, however many trains it hits', () => {
        const wreck = (id: string, distance: number) => ({ ...train(id, 'e1', distance, -1), crashed: true, speed: 0 });
        const w = world({ ...graph, trains: { a: wreck('a', 60), b: wreck('b', 62), t: train('t', 'e1', 50, 1) } });
        const { events } = stepSimulation(w, 0.05, ctx());
        const collisions = events.filter(e => e.type === 'collision');
        expect(collisions).toHaveLength(1);
        expect(collisions[0]).toMatchObject({ trainId: 't', otherTrainIds: ['a', 'b'] });
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

        it('throws linked points with the ones it is wired to', () => {
            const w = base('toggle');
            const linked = {
                ...w.nodes,
                S: { ...w.nodes.S, switchGroup: 'g' },
                far: node('far', 400, ['x', 'y'], { type: 'switch', switchState: 0, switchBranches: ['x', 'y'], switchGroup: 'g' }),
            };
            const { world: next, events } = stepSimulation({ ...w, nodes: linked }, 0.01, ctx());
            expect(next.nodes.far.switchState).toBe(1);
            expect(events).toContainEqual({ type: 'switch', nodeId: 'far', switchState: 1 });
        });
    });

    describe('train control', () => {
        it('a train stopped by the player does not move', () => {
            const w = world({ ...graph, trains: { t: { ...train('t', 'e0', 10), stopped: true } } });
            expect(stepSimulation(w, 1, ctx()).world.trains.t.distanceAlongEdge).toBe(10);
        });

        it('a red signal holds a train, then releases it on green', () => {
            const sig = { id: 's', nodeId: 'n1', state: 'red' as const, offset: { x: 0, y: 0 } };
            const frames = (w: SimWorld, seconds: number) => {
                const events: SimEvent[] = [];
                for (let i = 0; i < seconds * 60; i++) {
                    const r = stepSimulation(w, 1 / 60, ctx());
                    w = r.world;
                    events.push(...r.events);
                }
                return { world: w, events };
            };

            // Brakes to a stand at the stop line
            let r = frames(world({ ...graph, trains: { t: train('t', 'e0', 50) }, signals: { s: sig } }), 2);
            expect(r.world.trains.t.heldAtSignal).toBe(true);
            expect(r.events.filter(e => e.type === 'signal-hold')).toEqual([{ type: 'signal-hold', trainId: 't', edgeId: 'e0' }]);

            // Still red: stays put, no repeated hold event
            r = frames(r.world, 1);
            expect(r.events.some(e => e.type === 'signal-hold')).toBe(false);
            const heldAt = r.world.trains.t.distanceAlongEdge;

            r = frames({ ...r.world, signals: { s: { ...sig, state: 'green' } } }, 0.5);
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

