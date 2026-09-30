/**
 * Operating sessions: a stretch of railway time run as a shift, with a
 * tally at the end. A full session that ends without a wreck earns a bonus
 * on what it took, and so does one that keeps to the stations' timetables.
 * Pure functions; `tickSimulation` keeps the tally.
 */

import type { EdgeId, StationId, TrackEdge } from '../types';
import type { SimEvent } from './step';
import { earningsFor } from './economy';

export const SESSION = {
    /** How long a session runs, in railway minutes */
    MINUTES: 10,
    /** The bonus for a crash-free session, as a share of what it took */
    CLEAN_BONUS: 0.25,
    /**
     * The bonus for keeping to the timetables, as a share of what it took.
     * Big enough that the tightest timetable the trains can keep pays more
     * than none, for all the waiting at stations; a looser one doesn't.
     */
    PUNCTUAL_BONUS: 0.5,
    /** Keeping to them: a train there for at least this share of the departures due */
    PUNCTUAL_SHARE: 0.9,
} as const;

export interface OperatingSession {
    /** When it started and when it ends (simElapsed, seconds) */
    startedAt: number;
    endsAt: number;
    /** Hobby money taken, running and fares (US cents), before repairs */
    income: number;
    /** Repair bills (US cents) */
    repairs: number;
    /** Station calls */
    calls: number;
    /** Trains wrecked */
    wrecks: number;
    /** Timetabled departures that fell due */
    due: number;
    /** Of those, the ones a train was there to take */
    ran: number;
    /** Each timetabled station's latest departure taken (railway seconds), so each counts once */
    taken: Record<StationId, number>;
}

export interface SessionResult extends OperatingSession {
    /** The bonuses (US cents): nothing for a session cut short */
    bonus: number;
    endedEarly: boolean;
    /** Earned the crash-free bonus */
    clean: boolean;
    /** Earned the timetable bonus */
    punctual: boolean;
}

/** A session starting at railway time `now`. */
export function startSession(now: number): OperatingSession {
    return { startedAt: now, endsAt: now + SESSION.MINUTES * 60, income: 0, repairs: 0, calls: 0, wrecks: 0, due: 0, ran: 0, taken: {} };
}

/**
 * The session with a tick's events counted in, and the `due` timetabled
 * departures the tick passed. Unchanged (the same object) if nothing counts.
 */
export function tallySession(session: OperatingSession, events: SimEvent[], edges: Record<EdgeId, TrackEdge>, due = 0): OperatingSession {
    const { income, repairs } = earningsFor(events, edges);
    let calls = 0;
    let wrecks = 0;
    let ran = 0;
    let taken = session.taken;
    for (const event of events) {
        if (event.type === 'station-stop') {
            calls++;
            // A train there for a departure in the session, the first for it
            const { departs, stationId } = event;
            if (departs !== undefined && departs <= session.endsAt && departs > (taken[stationId] ?? -Infinity)) {
                ran++;
                taken = { ...taken, [stationId]: departs };
            }
        } else if (event.type === 'collision' || event.type === 'derail') wrecks++;
    }
    if (income === 0 && repairs === 0 && calls === 0 && wrecks === 0 && due === 0) return session;
    return {
        ...session,
        income: session.income + income,
        repairs: session.repairs + repairs,
        calls: session.calls + calls,
        wrecks: session.wrecks + wrecks,
        due: session.due + due,
        ran: session.ran + ran,
        taken,
    };
}

/**
 * The session's result at railway time `now`, with its bonuses: one for no
 * wreck, one for a train at nearly every timetabled departure. A session
 * cut short earns neither.
 */
export function finishSession(session: OperatingSession, now: number): SessionResult {
    const endedEarly = now < session.endsAt;
    const clean = !endedEarly && session.wrecks === 0;
    const punctual = !endedEarly && session.due > 0 && session.ran >= session.due * SESSION.PUNCTUAL_SHARE;
    const share = (clean ? SESSION.CLEAN_BONUS : 0) + (punctual ? SESSION.PUNCTUAL_BONUS : 0);
    return { ...session, bonus: Math.round(session.income * share), endedEarly, clean, punctual };
}
