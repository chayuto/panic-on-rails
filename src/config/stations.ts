/**
 * Station stops: where passenger trains call, and what their passengers pay.
 *
 * Fares pay for the ride: so much per metre of model track since the
 * train's last stop, per coach, up to the longest ride anyone takes. A
 * station earns most where trains have come a long way to reach it. A
 * station every few pieces earns no more than one would, and every stop
 * costs its dwell.
 *
 * Sizes are N scale's (mm); a bigger scale multiplies them by its `size`.
 */

export const STATIONS = {
    /** Platform length: nearly a Kato 248 mm straight. A long train overhangs it, as on a real layout */
    PLATFORM_LENGTH: 240,
    /** Platform width */
    PLATFORM_WIDTH: 14,
    /** From the track's centre line to the platform's edge, clear of the cars */
    PLATFORM_CLEARANCE: 10,
    /** Railway seconds a train stands at the platform */
    DWELL_SECONDS: 6,
    /** The timetables a station can keep: a departure every so many railway seconds */
    INTERVALS: [30, 45, 60, 90, 120, 180],
    /** US cents per metre ridden, per coach */
    FARE_CENTS_PER_METRE: 50,
    /** The longest ride a fare pays for (m) */
    MAX_RIDE_METRES: 3,
} as const;
