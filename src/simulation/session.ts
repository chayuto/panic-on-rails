/**
 * Operating sessions: a stretch of railway time run as a shift, with a
 * tally at the end. A full session that ends without a wreck earns a bonus
 * on what it took. Pure functions; `tickSimulation` keeps the tally.
 */

import type { EdgeId, TrackEdge } from '../types';
import type { SimEvent } from './step';
import { earningsFor } from './economy';

export const SESSION = {
    /** How long a session runs, in railway minutes */
    MINUTES: 10,
    /** The bonus for a crash-free session, as a share of what it took */
    CLEAN_BONUS: 0.25,
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
}

export interface SessionResult extends OperatingSession {
    /** The crash-free bonus (US cents): nothing after a wreck, or for a session cut short */
    bonus: number;
    endedEarly: boolean;
}

/** A session starting at railway time `now`. */
export function startSession(now: number): OperatingSession {
    return { startedAt: now, endsAt: now + SESSION.MINUTES * 60, income: 0, repairs: 0, calls: 0, wrecks: 0 };
}

/** The session with a tick's events counted in. Unchanged (the same object) if nothing counts. */
export function tallySession(session: OperatingSession, events: SimEvent[], edges: Record<EdgeId, TrackEdge>): OperatingSession {
    const { income, repairs } = earningsFor(events, edges);
    let calls = 0;
    let wrecks = 0;
    for (const event of events) {
        if (event.type === 'station-stop') calls++;
        else if (event.type === 'collision' || event.type === 'derail') wrecks++;
    }
    if (income === 0 && repairs === 0 && calls === 0 && wrecks === 0) return session;
    return {
        ...session,
        income: session.income + income,
        repairs: session.repairs + repairs,
        calls: session.calls + calls,
        wrecks: session.wrecks + wrecks,
    };
}

/** The session's result at railway time `now`, with its bonus. */
export function finishSession(session: OperatingSession, now: number): SessionResult {
    const endedEarly = now < session.endsAt;
    const bonus = !endedEarly && session.wrecks === 0 ? Math.round(session.income * SESSION.CLEAN_BONUS) : 0;
    return { ...session, bonus, endedEarly };
}
