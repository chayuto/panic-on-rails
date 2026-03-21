/**
 * Simulation Event Log Slice
 *
 * Records train movement events for debugging and replay analysis.
 * Uses a ring buffer to cap memory usage.
 */

import type { SimulationSliceCreator } from './types';
import type { TrainId, EdgeId } from '../../../types';

/** Maximum number of events to keep in the log */
const MAX_LOG_SIZE = 500;

export type SimEventType = 'traverse' | 'bounce' | 'collision' | 'spawn' | 'sensor';

export interface SimEvent {
    /** Monotonic event index */
    seq: number;
    /** Simulation timestamp (seconds since start) */
    time: number;
    type: SimEventType;
    trainId: TrainId;
    /** Edge the train is on after the event */
    edgeId: EdgeId;
    /** Details vary by event type */
    detail: string;
}

export interface EventLogSlice {
    /** Ring-buffered event log */
    simLog: SimEvent[];
    /** Next sequence number */
    simLogSeq: number;
    /** Simulation elapsed time in seconds */
    simElapsed: number;
    /** Push a new event */
    logEvent: (type: SimEventType, trainId: TrainId, edgeId: EdgeId, detail: string) => void;
    /** Advance elapsed time */
    tickElapsed: (dt: number) => void;
    /** Clear the log (e.g. on simulation reset) */
    clearLog: () => void;
}

export const createEventLogSlice: SimulationSliceCreator<EventLogSlice> = (set) => ({
    simLog: [],
    simLogSeq: 0,
    simElapsed: 0,

    logEvent: (type, trainId, edgeId, detail) => {
        set((state) => {
            const event: SimEvent = {
                seq: state.simLogSeq,
                time: Math.round(state.simElapsed * 1000) / 1000,
                type,
                trainId,
                edgeId,
                detail,
            };
            state.simLogSeq += 1;

            // Ring buffer: drop oldest when full
            if (state.simLog.length >= MAX_LOG_SIZE) {
                state.simLog.shift();
            }
            state.simLog.push(event);
        });
    },

    tickElapsed: (dt) => {
        set((state) => {
            state.simElapsed += dt;
        });
    },

    clearLog: () => {
        set((state) => {
            state.simLog = [];
            state.simLogSeq = 0;
            state.simElapsed = 0;
        });
    },
});
