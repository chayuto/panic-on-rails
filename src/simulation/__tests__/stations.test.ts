/**
 * Station stops: passenger trains brake for the end of a platform, stand
 * there while the passengers get on and off, and are paid their fares.
 * Freight trains pass through.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { stepSimulation, type SimWorld, type SimEvent } from '../step';
import { stopAhead } from '../driving';
import { earningsFor } from '../economy';
import { departuresDue, fareFor, fitPlatform, nextDeparture, nextStationName, stationsByEdge, stopPointOf } from '../stations';
import { coachesOf } from '../../data/rollingStock';
import { SIGNAL_STOP_GAP } from '../movement';
import { lineGraph, straightEdge, train, world } from './fixtures';
import { STATIONS } from '../../config/stations';
import { sizeOf } from '../../config/scales';
import { carriesPassengers } from '../../data/rollingStock';
import { resetWorld, loadSetPlan } from '../harness';
import { runSimulation } from '../tick';
import { spawnTrainAtClearestSpot } from '../controls';
import { useTrackStore } from '../../stores/useTrackStore';
import { useLogicStore } from '../../stores/useLogicStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import type { Station } from '../../types';

const ctx = () => ({ now: 0, random: () => 0.5 });

/** A 240 mm platform with its middle `position` along `edgeId`. */
const station = (id: string, edgeId: string, position: number, length = 240): Station =>
    ({ id, edgeId, position, length, name: id });

/** Run `seconds` at 60 fps, collecting every event. */
function run(w: SimWorld, seconds: number): { world: SimWorld; events: SimEvent[] } {
    const events: SimEvent[] = [];
    for (let i = 0; i < Math.round(seconds * 60); i++) {
        const r = stepSimulation(w, 1 / 60, ctx());
        w = r.world;
        events.push(...r.events);
    }
    return { world: w, events };
}

const stops = (events: SimEvent[]) => events.filter((e): e is Extract<SimEvent, { type: 'station-stop' }> => e.type === 'station-stop');

describe('platforms and fares', () => {
    it('a train stops with its front at the platform\'s far end, whichever way it comes', () => {
        const s = station('a', 'e0', 124);
        expect(stopPointOf(s, 1)).toBe(244);
        expect(stopPointOf(s, -1)).toBe(4);
    });

    it('fares pay for the ride, per coach, up to the longest ride', () => {
        const passenger = { ...train('t', 'e0', 0), carriageCount: 3 }; // a loco and two coaches
        expect(coachesOf(passenger)).toBe(2);
        expect(fareFor({ ...passenger, ride: 2000 }, 2)).toBe(2 * STATIONS.FARE_CENTS_PER_METRE * 2);
        expect(fareFor({ ...passenger, ride: 50_000 }, 2)).toBe(STATIONS.MAX_RIDE_METRES * STATIONS.FARE_CENTS_PER_METRE * 2);
        expect(fareFor(passenger, 2)).toBe(0);
        // A lone locomotive still takes a passenger or two
        expect(coachesOf({ ...passenger, carriageCount: 1 })).toBe(1);
        // A wagon carries no one
        expect(coachesOf({ stockId: 'hornby-smokey-joe', carLengths: [108, 100, 88] })).toBe(1);
    });

    it('a platform is the scale\'s length, or the whole piece if that\'s shorter, and stays on the piece', () => {
        const kato = { ...straightEdge('k', 'a', 'b', 0, 248), partId: 'kato-20-000' };
        expect(fitPlatform(kato, 124)).toEqual({ position: 124, length: STATIONS.PLATFORM_LENGTH });
        expect(fitPlatform(kato, 10)).toEqual({ position: STATIONS.PLATFORM_LENGTH / 2, length: STATIONS.PLATFORM_LENGTH });
        const short = { ...straightEdge('s', 'a', 'b', 0, 124), partId: 'kato-20-020' };
        expect(fitPlatform(short, 100)).toEqual({ position: 62, length: 124 });
        // H0 platforms are longer: an H0 straight takes a platform its own length
        const h0 = { ...straightEdge('h', 'a', 'b', 0, 360), partId: 'marklin-24360' };
        expect(fitPlatform(h0, 180).length).toBe(Math.min(360, STATIONS.PLATFORM_LENGTH * sizeOf('ho-scale')));
    });

    it('names stations in order, filling gaps', () => {
        expect(nextStationName({})).toBe('Station 1');
        expect(nextStationName({ a: station('a', 'e0', 0), b: { ...station('b', 'e0', 0), name: 'Station 1' } })).toBe('Station 2');
    });

    it('freight trains carry no passengers; free-build trains do', () => {
        expect(carriesPassengers({ stockId: 'freight' })).toBe(false);
        expect(carriesPassengers({ stockId: 'h0-goods' })).toBe(false);
        expect(carriesPassengers({ stockId: 'diesel-passenger' })).toBe(true);
        expect(carriesPassengers({})).toBe(true);
    });

    it('fares are income', () => {
        const events: SimEvent[] = [{ type: 'station-stop', trainId: 't', stationId: 'a', edgeId: 'e0', fare: 250 }];
        expect(earningsFor(events, {})).toEqual({ income: 250, repairs: 0 });
    });
});

describe('stopAhead with stations', () => {
    const { edges, nodes } = lineGraph(4, 248);
    const platforms = stationsByEdge({ a: station('a', 'e1', 124) });

    it('finds the platform\'s far end ahead, heading either way', () => {
        expect(stopAhead(train('t', 'e0', 200), edges, nodes, new Set(), 1000, platforms))
            .toEqual({ distance: 48 + 244, kind: 'station', stationId: 'a' });
        expect(stopAhead(train('t', 'e2', 100, -1), edges, nodes, new Set(), 1000, platforms))
            .toEqual({ distance: 100 + 244, kind: 'station', stationId: 'a' });
    });

    it('passes the station it has just called at, and ignores stations for a train that doesn\'t call', () => {
        const called = { ...train('t', 'e1', 244), calledAt: 'a' };
        expect(stopAhead(called, edges, nodes, new Set(), 100, platforms)).toBeNull();
        expect(stopAhead(train('t', 'e0', 200), edges, nodes, new Set(), 1000)).toEqual({ distance: 48 + 3 * 248, kind: 'end' });
    });

    it('stops for whichever comes first: the platform, or a red signal', () => {
        // A short platform on e1, ending 160 mm along it
        const short = stationsByEdge({ b: station('b', 'e1', 100, 120) });
        // A red signal at the far end of e1: its stop line is past the platform's end
        expect(stopAhead(train('t', 'e0', 200), edges, nodes, new Set(['n2']), 1000, short))
            .toEqual({ distance: 48 + 160, kind: 'station', stationId: 'b' });
        // A red signal at the near end of e1 comes first
        expect(stopAhead(train('t', 'e0', 100), edges, nodes, new Set(['n1']), 1000, short))
            .toEqual({ distance: 148 - SIGNAL_STOP_GAP, kind: 'signal' });
        // And a platform ending inside a signal's stop gap: the signal's line is first
        expect(stopAhead(train('t', 'e0', 200), edges, nodes, new Set(['n2']), 1000, platforms))
            .toEqual({ distance: 48 + 248 - SIGNAL_STOP_GAP, kind: 'signal' });
    });
});

describe('calling at a station (stepSimulation)', () => {
    const graph = lineGraph(4, 248);
    const stations = { a: station('a', 'e2', 124) };

    it('pulls up with its front at the platform\'s end, stands, is paid, and sets off', () => {
        let w = world({ ...graph, stations, trains: { t: { ...train('t', 'e0', 0), carriageCount: 3 } } });
        const events: SimEvent[] = [];
        for (let i = 0; i < 60 * 20 && stops(events).length === 0; i++) {
            const r = stepSimulation(w, 1 / 60, ctx());
            w = r.world;
            events.push(...r.events);
        }
        const [stop] = stops(events);
        expect(stop).toMatchObject({ trainId: 't', stationId: 'a', edgeId: 'e2' });
        const t = w.trains.t;
        expect(t).toMatchObject({ currentEdgeId: 'e2', speed: 0, calledAt: 'a', ride: 0, dwell: STATIONS.DWELL_SECONDS });
        expect(t.distanceAlongEdge).toBeCloseTo(244, 6);
        // The passengers paid for the ride from the start of e0 to the platform's end
        expect(stop.fare).toBe(fareFor({ ...t, ride: 2 * 248 + 244 }, coachesOf(t)));

        // It stands for the dwell...
        const standing = run(w, STATIONS.DWELL_SECONDS - 0.5).world.trains.t;
        expect(standing).toMatchObject({ currentEdgeId: 'e2', speed: 0 });
        expect(standing.distanceAlongEdge).toBeCloseTo(244, 6);
        // ...then sets off, without calling there again
        const { world: away, events: later } = run(w, STATIONS.DWELL_SECONDS + 2);
        expect(stops(later)).toEqual([]);
        expect(away.trains.t.dwell).toBeUndefined();
        expect(away.trains.t.speed).toBeGreaterThan(0);
    });

    it('calls again the next time it comes by', () => {
        // Out along the line, back from the buffer stop, and through the station again
        const w = world({ ...graph, stations, trains: { t: { ...train('t', 'e0', 0), carriageCount: 3 } } });
        const calls = stops(run(w, 40).events);
        expect(calls.length).toBeGreaterThanOrEqual(2);
        expect(calls.every(c => c.stationId === 'a')).toBe(true);
    });

    it('freight passes through without stopping', () => {
        const w = world({ ...graph, stations, trains: { t: { ...train('t', 'e0', 0), stockId: 'freight' } } });
        expect(stops(run(w, 12).events)).toEqual([]);
    });
});

describe('timetables', () => {
    it('have a departure due on the clock, every interval', () => {
        expect(nextDeparture({}, 10)).toBeUndefined();
        const everyMinute = { interval: 60 };
        expect(nextDeparture(everyMinute, 0)).toBe(0);
        expect(nextDeparture(everyMinute, 0.5)).toBe(60);
        expect(nextDeparture(everyMinute, 60)).toBe(60);
        // Ready on the minute, give or take a rounding error: that departure
        expect(nextDeparture(everyMinute, 120.0000001)).toBe(120);
        expect(nextDeparture(everyMinute, 121)).toBe(180);
    });

    it('count the departures that fall due in a stretch of time', () => {
        const stations = {
            a: { ...station('a', 'e0', 124), interval: 60 },
            b: { ...station('b', 'e1', 124), interval: 45 },
            c: station('c', 'e2', 124),
        };
        // a at 60, 120 and 180; b at 45, 90, 135 and 180; c has none
        expect(departuresDue(stations, 0, 180)).toBe(7);
        expect(departuresDue(stations, 59.99, 60.01)).toBe(1);
        expect(departuresDue(stations, 60.01, 60.02)).toBe(0);
    });

    it('hold a calling train for its departure, which it leaves on', () => {
        const graph = lineGraph(4, 248);
        const stations = { a: { ...station('a', 'e2', 124), interval: 60 } };
        let w = world({ ...graph, stations, trains: { t: { ...train('t', 'e0', 0), carriageCount: 3 } } });
        // Step with the railway clock running, as the tick does
        let clock = 0;
        const events: SimEvent[] = [];
        const step = () => {
            const r = stepSimulation(w, 1 / 60, { ...ctx(), clock });
            clock += 1 / 60;
            w = r.world;
            events.push(...r.events);
        };
        while (stops(events).length === 0 && clock < 20) step();
        const [stop] = stops(events);
        // It pulled in some seconds after the start, so the first departure it can take is the 1:00
        expect(stop.departs).toBe(60);
        expect(w.trains.t.dwell!).toBeCloseTo(60 - clock, 6);
        while (clock < 59.9) step();
        expect(w.trains.t).toMatchObject({ speed: 0, currentEdgeId: 'e2' });
        while (clock < 61) step();
        expect(w.trains.t.dwell).toBeUndefined();
        expect(w.trains.t.speed).toBeGreaterThan(0);
    });
});

describe('a station on the M1 oval', () => {
    beforeEach(() => {
        resetWorld();
        useCollectionStore.getState().setMode('collection');
        loadSetPlan('kato-20-852');
        if (Object.keys(useSimulationStore.getState().trains).length === 0) spawnTrainAtClearestSpot();
    });

    it('the train calls every lap, and fares are paid on top of running', () => {
        const { edges } = useTrackStore.getState();
        const straight = Object.values(edges).find(e => e.partId === 'kato-20-000')!;
        const { position, length } = fitPlatform(straight, straight.length / 2);
        useLogicStore.getState().addStation(straight.id, position, length);

        const before = useCollectionStore.getState().wallet;
        const events = runSimulation(60 * 60);
        const calls = events.filter(e => e.type === 'station-stop');
        // A lap of the oval is about 3.3 m: at cruising speed, a call every ~40 s or so
        expect(calls.length).toBeGreaterThanOrEqual(1);
        const fares = calls.reduce((sum, e) => sum + (e.type === 'station-stop' ? e.fare : 0), 0);
        expect(fares).toBeGreaterThan(0);
        expect(useCollectionStore.getState().wallet - before).toBeGreaterThanOrEqual(fares);
        // And it's standing or moving on, never stuck
        expect(Object.values(useSimulationStore.getState().trains)[0].crashed).toBeFalsy();
    });
});

