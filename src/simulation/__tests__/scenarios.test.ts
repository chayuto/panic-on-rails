/**
 * Headless scenario tests: build the shipped templates through the real
 * stores and track creators, then step the real simulation. No browser.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetWorld, loadRecipe, summarize, simHarness } from '../harness';
import { useSimulationStore } from '../../stores/useSimulationStore';
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

    it('crossover-express: two trains share a figure-8 for 60 s without crashing', () => {
        loadRecipe(loadTemplateJson('crossover-express'));
        const events = simHarness.runSeconds(60);
        expect(summarize().crashed).toBe(0);
        expect(count(events, 'traverse')).toBeGreaterThan(40);
    });

    it('switch-showdown: the two trains collide', () => {
        loadRecipe(loadTemplateJson('switch-showdown'));
        const events = simHarness.runSeconds(20);
        expect(summarize().crashed).toBe(2);
        expect(count(events, 'collision')).toBe(2);
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
