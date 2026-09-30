/**
 * Station stops: a passenger train brakes for a platform ahead, stands for
 * a while, and its passengers pay for their ride. Freight trains pass
 * through (`carriesPassengers`). Pure functions, used by `stepSimulation`
 * and the driving code.
 */

import type { EdgeId, Station, StationId, TrackEdge, Train } from '../types';
import { STATIONS } from '../config/stations';
import { sizeOf } from '../config/scales';
import { getPartById } from '../data/catalog';
import { carCount } from '../utils/trainCars';

export type StationsByEdge = ReadonlyMap<EdgeId, readonly Station[]>;

/** Stations grouped by the edge their platform is on. */
export function stationsByEdge(stations: Record<StationId, Station>): StationsByEdge {
    const byEdge = new Map<EdgeId, Station[]>();
    for (const station of Object.values(stations)) {
        const list = byEdge.get(station.edgeId);
        if (list) list.push(station);
        else byEdge.set(station.edgeId, [station]);
    }
    return byEdge;
}

/** Where a train heading `direction` along the edge stops: its front at the platform's far end. */
export function stopPointOf(station: Station, direction: 1 | -1): number {
    return station.position + (direction * station.length) / 2;
}

/** Cars carrying passengers: every car but the locomotive. */
export function coachesOf(train: Train): number {
    return Math.max(1, carCount(train) - 1);
}

/** What a stop's passengers pay, US cents: their ride so far, per coach, up to the longest ride. */
export function fareFor(train: Train): number {
    const metres = Math.min((train.ride ?? 0) / 1000, STATIONS.MAX_RIDE_METRES);
    return Math.round(metres * STATIONS.FARE_CENTS_PER_METRE * coachesOf(train));
}

/**
 * The platform for a station placed at `position` along `edge`: the
 * scale's platform length, or the whole piece if that's shorter, kept on
 * the piece.
 */
export function fitPlatform(edge: TrackEdge, position: number): { position: number; length: number } {
    const size = sizeOf(getPartById(edge.partId)?.scale);
    const length = Math.min(STATIONS.PLATFORM_LENGTH * size, edge.length);
    const middle = Math.max(length / 2, Math.min(edge.length - length / 2, position));
    return { position: middle, length };
}

/**
 * A timetabled station's first departure due at or after railway time
 * `time` (seconds). Undefined for a station without a timetable.
 */
export function nextDeparture(station: Pick<Station, 'interval'>, time: number): number | undefined {
    if (!station.interval) return undefined;
    // A hair's grace, so a train ready right on the minute takes that
    // departure (and at 0, not -0)
    return (Math.ceil(time / station.interval - 1e-6) || 0) * station.interval;
}

/** The timetabled departures that fall due in (from, to]: the ones a tick passes. */
export function departuresDue(stations: Record<StationId, Station>, from: number, to: number): number {
    let due = 0;
    for (const { interval } of Object.values(stations)) {
        if (interval) due += Math.floor(to / interval + 1e-9) - Math.floor(from / interval + 1e-9);
    }
    return due;
}

/** The first "Station n" name not taken yet. */
export function nextStationName(stations: Record<StationId, Station>): string {
    const taken = new Set(Object.values(stations).map(s => s.name));
    let n = 1;
    while (taken.has(`Station ${n}`)) n++;
    return `Station ${n}`;
}
