/**
 * Operating sessions: a timed shift, tallied, with a bonus for a full one
 * without a wreck.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { finishSession, SESSION, startSession, tallySession } from '../session';
import { lineGraph } from './fixtures';
import { resetWorld, loadSetPlan } from '../harness';
import { runSimulation, seedSimulation } from '../tick';
import { beginSession, endSessionEarly } from '../controls';
import { fitPlatform } from '../stations';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useLogicStore } from '../../stores/useLogicStore';
import { ECONOMY } from '../economy';
import type { SimEvent } from '../step';

const { edges } = lineGraph(2, 1000); // two 1 m pieces

describe('the tally', () => {
    it('counts running and fares as income, and calls, wrecks and repairs', () => {
        const events: SimEvent[] = [
            { type: 'traverse', trainId: 't', fromEdgeId: 'e0', toEdgeId: 'e1' },
            { type: 'station-stop', trainId: 't', stationId: 's', edgeId: 'e1', fare: 120 },
            { type: 'derail', trainId: 'u', edgeId: 'e1', location: { x: 0, y: 0 }, speed: 300 },
        ];
        const session = tallySession(startSession(10), events, edges);
        expect(session).toEqual({
            startedAt: 10,
            endsAt: 10 + SESSION.MINUTES * 60,
            income: ECONOMY.CENTS_PER_METRE + 120,
            repairs: ECONOMY.REPAIR_CENTS,
            calls: 1,
            wrecks: 1,
            due: 0,
            ran: 0,
            taken: {},
        });
    });

    it('is left alone by a tick with nothing to count', () => {
        const session = startSession(0);
        expect(tallySession(session, [{ type: 'bounce', trainId: 't', edgeId: 'e0' }], edges)).toBe(session);
    });

    it('pays a quarter on top for a full session without a wreck, and nothing otherwise', () => {
        const session = { ...startSession(0), income: 4000 };
        const end = session.endsAt;
        expect(finishSession(session, end)).toMatchObject({ bonus: 1000, endedEarly: false, clean: true, punctual: false });
        expect(finishSession({ ...session, wrecks: 1 }, end).bonus).toBe(0);
        expect(finishSession(session, end - 1)).toMatchObject({ bonus: 0, endedEarly: true });
    });

    it('counts the timetabled departures that fell due, and each a train was there for, once', () => {
        const stop = (stationId: string, departs?: number): SimEvent =>
            ({ type: 'station-stop', trainId: 't', stationId, edgeId: 'e1', fare: 0, ...(departs !== undefined && { departs }) });
        let session = tallySession(startSession(0), [stop('s', 60), stop('u')], edges, 2);
        expect(session).toMatchObject({ due: 2, ran: 1, calls: 2, taken: { s: 60 } });
        // The same departure again doesn't count twice; the next one does
        session = tallySession(session, [stop('s', 60)], edges);
        expect(session.ran).toBe(1);
        session = tallySession(session, [stop('s', 120)], edges, 1);
        expect(session).toMatchObject({ due: 3, ran: 2 });
        // Nor one after the session ends
        expect(tallySession(session, [stop('s', session.endsAt + 30)], edges).ran).toBe(2);
    });

    it('pays half again for keeping to the timetables: a train there for nine departures in ten', () => {
        const session = { ...startSession(0), income: 4000, due: 10 };
        const end = session.endsAt;
        expect(finishSession({ ...session, ran: 9 }, end)).toMatchObject({ bonus: 3000, clean: true, punctual: true });
        expect(finishSession({ ...session, ran: 8 }, end)).toMatchObject({ bonus: 1000, punctual: false });
        // On time without a wreck, or a wreck on time
        expect(finishSession({ ...session, ran: 10, wrecks: 1 }, end)).toMatchObject({ bonus: 2000, clean: false, punctual: true });
        // No timetable, no timetable bonus
        expect(finishSession({ ...session, due: 0 }, end)).toMatchObject({ bonus: 1000, punctual: false });
        // Cut short: nothing
        expect(finishSession({ ...session, ran: 10 }, end - 1).bonus).toBe(0);
    });
});

// A session is ten railway minutes, 36,000 steps: quick alone, but CI runs
// it beside other long simulations, and under coverage
const SESSION_RUN = { timeout: 30_000 };

describe('a session on the M1 oval', SESSION_RUN, () => {
    beforeEach(() => {
        resetWorld();
        seedSimulation(1);
        useCollectionStore.getState().setMode('collection');
        loadSetPlan('kato-20-852');
        const sim = useSimulationStore.getState();
        const edgeId = Object.values(sim.trains)[0].currentEdgeId;
        sim.clearTrains();
        sim.spawnTrain(edgeId, undefined, undefined, undefined, 'diesel-passenger');
        const straight = Object.values(useTrackStore.getState().edges).find(e => e.partId === 'kato-20-000')!;
        const platform = fitPlatform(straight, straight.length / 2);
        useLogicStore.getState().addStation(straight.id, platform.position, platform.length);
    });

    it('runs ten railway minutes, then pays its crash-free bonus into the wallet', () => {
        beginSession();
        expect(useSimulationStore.getState().isRunning).toBe(true);
        const before = useCollectionStore.getState().wallet;
        runSimulation(SESSION.MINUTES * 60 * 60 + 60);

        const { session, sessionResult } = useSimulationStore.getState();
        expect(session).toBeNull();
        expect(sessionResult).toMatchObject({ wrecks: 0, endedEarly: false });
        expect(sessionResult!.calls).toBeGreaterThanOrEqual(10);
        expect(sessionResult!.bonus).toBe(Math.round(sessionResult!.income * SESSION.CLEAN_BONUS));
        // Running and fares, plus the bonus
        expect(useCollectionStore.getState().wallet - before).toBeGreaterThanOrEqual(sessionResult!.income + sessionResult!.bonus - 100);
    });

    it('cut short, it tallies what it took and pays no bonus', () => {
        beginSession();
        runSimulation(60 * 60);
        endSessionEarly();
        const { session, sessionResult } = useSimulationStore.getState();
        expect(session).toBeNull();
        expect(sessionResult).toMatchObject({ endedEarly: true, bonus: 0 });
        expect(sessionResult!.income).toBeGreaterThan(0);
    });

    it('keeps a timetable the starter train can make, and pays for it; one it can\'t make, it misses', () => {
        const station = Object.values(useLogicStore.getState().stations)[0];
        const result = (interval: number) => {
            useLogicStore.getState().setStationInterval(station.id, interval);
            beginSession();
            runSimulation(SESSION.MINUTES * 60 * 60 + 60);
            return useSimulationStore.getState().sessionResult!;
        };
        // A lap and the call take it about 46 s
        const kept = result(45);
        expect(kept.due).toBeGreaterThanOrEqual(12);
        expect(kept).toMatchObject({ clean: true, punctual: true });
        expect(kept.ran).toBe(kept.due);
        expect(kept.bonus).toBe(Math.round(kept.income * (SESSION.CLEAN_BONUS + SESSION.PUNCTUAL_BONUS)));
        // Every 30 s is too often for one train: it's there for every other departure
        const missed = result(30);
        expect(missed.punctual).toBe(false);
        expect(missed.ran / missed.due).toBeLessThan(0.6);
    });

    it('a wreck costs the bonus', () => {
        beginSession();
        runSimulation(60);
        // The train leaves the rails
        const id = Object.keys(useSimulationStore.getState().trains)[0];
        useSimulationStore.setState(s => ({ trains: { ...s.trains, [id]: { ...s.trains[id], stockId: undefined, throttle: 400, speed: 400 } } }));
        runSimulation(SESSION.MINUTES * 60 * 60);
        const { sessionResult } = useSimulationStore.getState();
        expect(sessionResult!.wrecks).toBeGreaterThan(0);
        expect(sessionResult!.bonus).toBe(0);
    });
});
