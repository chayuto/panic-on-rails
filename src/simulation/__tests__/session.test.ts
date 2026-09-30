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
        });
    });

    it('is left alone by a tick with nothing to count', () => {
        const session = startSession(0);
        expect(tallySession(session, [{ type: 'bounce', trainId: 't', edgeId: 'e0' }], edges)).toBe(session);
    });

    it('pays a quarter on top for a full session without a wreck, and nothing otherwise', () => {
        const session = { ...startSession(0), income: 4000 };
        const end = session.endsAt;
        expect(finishSession(session, end)).toMatchObject({ bonus: 1000, endedEarly: false });
        expect(finishSession({ ...session, wrecks: 1 }, end).bonus).toBe(0);
        expect(finishSession(session, end - 1)).toMatchObject({ bonus: 0, endedEarly: true });
    });
});

describe('a session on the M1 oval', () => {
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
