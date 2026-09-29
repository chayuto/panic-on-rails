/**
 * Headless scenario tests: build the shipped templates through the real
 * stores and track creators, then step the real simulation. No browser.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetWorld, loadRecipe, loadSetPlan, summarize, simHarness } from '../harness';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { loadTemplateJson } from './fixtures';

const count = (events: { type: string }[], type: string) => events.filter(e => e.type === type).length;

describe('template scenarios (headless)', () => {
    beforeEach(() => {
        resetWorld();
        simHarness.seed(1);
    });

    it.each(['simple-oval', 'wooden-starter'])('%s: one train loops for 60 s without incident', (id) => {
        loadRecipe(loadTemplateJson(id));
        const events = simHarness.runSeconds(60);
        const s = summarize();
        expect(s.trains).toHaveLength(1);
        expect(s.crashed).toBe(0);
        expect(count(events, 'bounce')).toBe(0);
        // A closed loop keeps the train moving from edge to edge
        expect(count(events, 'traverse')).toBeGreaterThan(20);
    });

    describe('crossover-express (oval with a crossover into a siding)', () => {
        /** The main line's turnout: the one joined to a plain S124 of the oval. */
        const mainTurnout = () => {
            const { nodes, edges } = useTrackStore.getState();
            return Object.values(nodes).find(n => n.type === 'switch'
                && n.connections.some(id => edges[id]?.partId === 'kato-20-020'))!;
        };

        it('two trains lap the oval for 60 s without crashing', () => {
            loadRecipe(loadTemplateJson('crossover-express'));
            const events = simHarness.runSeconds(60);
            expect(summarize().crashed).toBe(0);
            expect(count(events, 'traverse')).toBeGreaterThan(40);
            expect(count(events, 'bounce')).toBe(0);
        });

        it('throwing the crossover sends a train into the siding, where the buffer stops turn it back', () => {
            loadRecipe(loadTemplateJson('crossover-express'));
            useTrackStore.getState().toggleSwitch(mainTurnout().id);
            const events = simHarness.runSeconds(20);
            expect(count(events, 'bounce')).toBeGreaterThan(0);
        });
    });

    describe('Kato V7: M1 and V5 joined by the WX310 scissors crossover', () => {
        const scissorsPoints = () => {
            const { nodes, edges } = useTrackStore.getState();
            return Object.values(nodes).filter(n => n.type === 'switch'
                && n.connections.some(id => edges[id]?.partId === 'kato-20-210'));
        };

        it('has points at all four ends, each joined to the layout', () => {
            loadSetPlan('kato-20-866', 'm1-v5-scissors');
            const points = scissorsPoints();
            expect(points).toHaveLength(4);
            for (const n of points) expect(n.connections).toHaveLength(3);
        });

        it('one control throws all four points', () => {
            loadSetPlan('kato-20-866', 'm1-v5-scissors');
            useTrackStore.getState().toggleSwitch(scissorsPoints()[0].id);
            expect(scissorsPoints().map(n => n.switchState)).toEqual([1, 1, 1, 1]);
            useTrackStore.getState().toggleSwitch(scissorsPoints()[2].id);
            expect(scissorsPoints().map(n => n.switchState)).toEqual([0, 0, 0, 0]);
        });

        it('thrown, it swaps each train between the ovals', () => {
            loadSetPlan('kato-20-866', 'm1-v5-scissors');
            useTrackStore.getState().toggleSwitch(scissorsPoints()[0].id);
            const events = simHarness.runSeconds(60);
            const { edges } = useTrackStore.getState();
            const visited = new Map<string, Set<string>>();
            for (const e of events) {
                if (e.type !== 'traverse') continue;
                const parts = visited.get(e.trainId) ?? new Set();
                parts.add(edges[e.toEdgeId]?.partId ?? '?');
                visited.set(e.trainId, parts);
            }
            expect(visited.size).toBe(2);
            for (const parts of visited.values()) {
                // R315 curves are M1's outer oval, R282 curves V5's inner one
                expect(parts).toContain('kato-20-120');
                expect(parts).toContain('kato-20-110');
            }
            expect(summarize().crashed).toBe(0);
            expect(count(events, 'bounce')).toBe(0);
        });
    });

    describe('switch-showdown (passing-loop puzzle)', () => {
        const westSwitch = () => Object.values(useTrackStore.getState().nodes)
            .filter(n => n.type === 'switch')
            .sort((a, b) => a.position.x - b.position.x)[0];

        it('is one connected line with a passing loop', () => {
            loadRecipe(loadTemplateJson('switch-showdown'));
            const nodes = Object.values(useTrackStore.getState().nodes);
            // Only the two ends of the line are open; both turnouts are fully joined
            expect(nodes.filter(n => n.connections.length === 1)).toHaveLength(2);
            expect(nodes.filter(n => n.type === 'switch').map(n => n.connections.length)).toEqual([3, 3]);
        });

        it('without intervention the trains collide head-on', () => {
            loadRecipe(loadTemplateJson('switch-showdown'));
            const events = simHarness.runSeconds(20);
            expect(summarize().crashed).toBe(2);
            expect(count(events, 'collision')).toBe(2);
        });

        it('flipping the west switch sends one train through the loop and they pass safely', () => {
            loadRecipe(loadTemplateJson('switch-showdown'));
            useTrackStore.getState().toggleSwitch(westSwitch().id);
            const events = simHarness.runSeconds(90);
            expect(summarize().crashed).toBe(0);
            // They keep shuttling end to end, passing in the loop each time
            expect(count(events, 'bounce')).toBeGreaterThanOrEqual(6);
        });
    });

    it('keeps simulating after a crash (debris physics must not mutate frozen store state)', () => {
        loadRecipe(loadTemplateJson('switch-showdown'));
        simHarness.runSeconds(20);
        const debrisBefore = useSimulationStore.getState().crashedParts.map(p => ({ ...p.position }));
        expect(debrisBefore.length).toBeGreaterThan(0);
        expect(() => simHarness.run(5)).not.toThrow();
        expect(useSimulationStore.getState().error).toBeNull();
    });

    it('replays identically with the same seed', () => {
        const run = () => {
            resetWorld();
            simHarness.seed(99);
            loadRecipe(loadTemplateJson('switch-showdown'));
            simHarness.runSeconds(20);
            const s = useSimulationStore.getState();
            return {
                trains: summarize().trains.map(({ id: _id, edgeId: _edge, ...t }) => t),
                debris: s.crashedParts.map(p => [Math.round(p.position.x), Math.round(p.position.y)]),
            };
        };
        expect(run()).toEqual(run());
    });
});
