/**
 * Play metrics, measured headlessly: how the economy paces the hobby, and
 * how often trains crash or derail over seeds, layouts and driving styles.
 *
 * The numbers are budgets. A change that makes the hobby drag, makes
 * stations pay for spam, or makes ordinary running crash fails here before
 * a player feels it. Run with PLAY_METRICS=1 to print the measurements.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resetWorld, loadSetPlan } from '../harness';
import { runSimulation, seedSimulation, type TickOptions } from '../tick';
import { createRng, type SimEvent } from '../step';
import { fitPlatform } from '../stations';
import { derailSpeed } from '../driving';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useCollectionStore, STARTER_COLLECTION } from '../../stores/useCollectionStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useLogicStore } from '../../stores/useLogicStore';
import { getAllSets } from '../../data/sets';
import { getRollingStock, topSpeedOf } from '../../data/rollingStock';

const FPS = 60;
/** How long each heavy-handed drive round a Kato layout lasts (simulated minutes) */
const DRIVE_MINUTES = 2;
/**
 * The long runs take a few seconds, several times that under coverage on a
 * CI runner; each economy run is 10–20 simulated minutes
 */
const LONG_RUN = { timeout: 60_000 };
const report: string[] = [];
const note = (line: string) => report.push(line);

/** Run `minutes` of simulated time, calling `each` once a simulated second. */
function runMinutes(minutes: number, each?: (second: number) => void, options?: TickOptions): SimEvent[] {
    const events: SimEvent[] = [];
    for (let second = 0; second < minutes * 60; second++) {
        each?.(second);
        events.push(...runSimulation(FPS, 1 / FPS, options));
    }
    return events;
}

const count = (events: SimEvent[], type: SimEvent['type']) => events.filter(e => e.type === type).length;

/** The M1 oval with one of the player's trains on it, and `stations` platforms on its straights. */
function starterOval(stockId: string, stations = 0): string {
    resetWorld();
    seedSimulation(1);
    loadSetPlan('kato-20-852');
    const sim = useSimulationStore.getState();
    const edgeId = Object.values(sim.trains)[0].currentEdgeId;
    sim.clearTrains();
    const trainId = sim.spawnTrain(edgeId, undefined, undefined, undefined, stockId);
    const straights = Object.values(useTrackStore.getState().edges).filter(e => e.partId === 'kato-20-000');
    for (const edge of straights.slice(0, stations)) {
        const platform = fitPlatform(edge, edge.length / 2);
        useLogicStore.getState().addStation(edge.id, platform.position, platform.length);
    }
    return trainId;
}

/** Hobby money per simulated minute, US cents, running for `minutes`. */
function earningRate(minutes: number): number {
    useCollectionStore.setState({ mode: 'collection', wallet: 0 });
    runMinutes(minutes);
    return useCollectionStore.getState().wallet / minutes;
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

describe('economy pacing: the starter train on the M1 oval', LONG_RUN, () => {
    beforeEach(() => resetWorld());

    it('earns about $9 a minute just running, as the design has it', () => {
        starterOval('diesel-passenger');
        const rate = earningRate(10);
        note(`M1, starter diesel, no stations: ${dollars(rate)}/min`);
        expect(rate).toBeGreaterThan(800);
        expect(rate).toBeLessThan(1000);
    });

    it('earns more with a station, but not a fortune', () => {
        starterOval('diesel-passenger');
        const running = earningRate(10);
        starterOval('diesel-passenger', 1);
        const withStation = earningRate(10);
        note(`M1, starter diesel, one station: ${dollars(withStation)}/min (${(withStation / running).toFixed(2)}×)`);
        expect(withStation / running).toBeGreaterThan(1.1);
        expect(withStation / running).toBeLessThan(1.5);
    });

    it('earns less with a station on every straight than with one: the dwells cost more than the fares', () => {
        starterOval('diesel-passenger', 1);
        const one = earningRate(10);
        starterOval('diesel-passenger', 4);
        const four = earningRate(10);
        note(`M1, starter diesel, a station on each of the 4 straights: ${dollars(four)}/min`);
        expect(four).toBeLessThan(one);
    });

    it('saves up for each V-set in minutes, not seconds and not hours', () => {
        starterOval('diesel-passenger', 1);
        const rate = earningRate(10);
        const minutesFor = (price: number) => Math.max(0, price - STARTER_COLLECTION.wallet) / rate;
        // Single track (V1–V7) first, then double track (V11 on), the bigger step
        for (const [tier, pattern, budget] of [['single track', /^V[1-7]$/, 12], ['double track', /^V1\d$/, 20]] as const) {
            const vSets = getAllSets().filter(s => s.brand === 'kato' && pattern.test(s.badge ?? ''));
            expect(vSets.length, tier).toBeGreaterThanOrEqual(3);
            for (const set of vSets) {
                note(`  ${set.badge} (${dollars(set.price ?? 0)}): ${minutesFor(set.price ?? 0).toFixed(1)} min`);
                expect(minutesFor(set.price ?? 0), `${set.badge}`).toBeLessThan(budget);
            }
            // The dearest is still worth saving up for: money that came much faster would be a bug
            expect(minutesFor(Math.max(...vSets.map(s => s.price ?? 0))), tier).toBeGreaterThan(4);
        }
    });
});

describe('crash and derail rates', () => {
    beforeEach(() => resetWorld());

    it('every boxed set\'s layout runs its trains for 5 minutes at the default throttle without incident', LONG_RUN, () => {
        for (const set of getAllSets()) {
            for (const plan of set.plans) {
                resetWorld();
                seedSimulation(1);
                loadSetPlan(set.id, plan.id);
                if (Object.keys(useSimulationStore.getState().trains).length === 0) continue;
                const events = runMinutes(5);
                expect({ plan: `${set.id}/${plan.id}`, derails: count(events, 'derail'), collisions: count(events, 'collision') })
                    .toEqual({ plan: `${set.id}/${plan.id}`, derails: 0, collisions: 0 });
            }
        }
    });

    it('flat out on the M1 oval: the starter diesel holds the curves, the express leaves the rails', () => {
        const curve = derailSpeed(315);
        for (const [stockId, derails] of [['diesel-passenger', false], ['commuter', false], ['express', true]] as const) {
            const trainId = starterOval(stockId);
            useSimulationStore.getState().setTrainThrottle(trainId, topSpeedOf({ stockId }));
            const events = runMinutes(2);
            note(`M1 flat out: ${getRollingStock(stockId)!.name} (top ${topSpeedOf({ stockId })} mm/s, R315 derails at ${Math.round(curve)}): ${count(events, 'derail')} derail(s)`);
            expect(count(events, 'derail') > 0, stockId).toBe(derails);
        }
    });

    // A train set's own train holds its own oval's curves flat out, as the box
    // sells it: the express trains are the fast ones, not the ones in the box
    it('flat out on its own layout, a train set\'s train holds the curves', LONG_RUN, () => {
        for (const set of getAllSets().filter(s => s.rollingStock?.length)) {
            resetWorld();
            seedSimulation(1);
            loadSetPlan(set.id);
            const sim = useSimulationStore.getState();
            for (const train of Object.values(sim.trains)) sim.setTrainThrottle(train.id, topSpeedOf(train));
            const events = runMinutes(2);
            note(`${set.id} flat out: ${count(events, 'derail')} derail(s)`);
            expect({ set: set.id, derails: count(events, 'derail') }).toEqual({ set: set.id, derails: 0 });
        }
    });

    /**
     * Every Kato plan, driven by someone who yanks each throttle to a random
     * setting every five seconds, for two minutes (a few laps of the biggest
     * layout), over `seeds`. Returns the derails and the train-hours run.
     * `stockId` swaps the plan's trains for that model.
     */
    function heavyHandedDerailRate(seeds: number[], stockId?: string): { derails: number; trainHours: number } {
        let trainHours = 0;
        let derails = 0;
        for (const seed of seeds) {
            for (const set of getAllSets().filter(s => s.brand === 'kato')) {
                resetWorld();
                seedSimulation(seed);
                loadSetPlan(set.id);
                const sim = useSimulationStore.getState();
                const placed = Object.values(sim.trains);
                if (placed.length === 0) continue;
                if (stockId) {
                    sim.clearTrains();
                    for (const t of placed) sim.spawnTrain(t.currentEdgeId, undefined, undefined, t.distanceAlongEdge, stockId);
                }
                const trains = Object.keys(useSimulationStore.getState().trains);
                const random = createRng(seed * 1000 + set.id.length);
                const events = runMinutes(DRIVE_MINUTES, second => {
                    if (second % 5 !== 0) return;
                    for (const id of trains) {
                        const train = useSimulationStore.getState().trains[id];
                        if (train && !train.crashed) useSimulationStore.getState().setTrainThrottle(id, random() * topSpeedOf(train));
                    }
                });
                trainHours += (trains.length * DRIVE_MINUTES) / 60;
                derails += count(events, 'derail');
            }
        }
        return { derails, trainHours };
    }

    it('heavy-handed driving: the starter diesel holds every Kato layout\'s curves, a free-build train at full power doesn\'t', LONG_RUN, () => {
        const diesel = heavyHandedDerailRate([1, 2], 'diesel-passenger');
        note(`Kato plans, starter diesel, random throttle every 5 s: ${diesel.derails} derails in ${diesel.trainHours.toFixed(1)} train-hours`);
        expect(diesel.derails).toBe(0);

        const freeBuild = heavyHandedDerailRate([1]);
        const rate = freeBuild.derails / freeBuild.trainHours;
        note(`Kato plans, free-build trains (top 300 mm/s), random throttle every 5 s: ${rate.toFixed(1)} derails/train-hour`);
        expect(rate).toBeGreaterThan(0);
    });
});

afterAll(() => {
    if (process.env.PLAY_METRICS) process.stdout.write(['', 'Play metrics', ...report, ''].join('\n'));
});
