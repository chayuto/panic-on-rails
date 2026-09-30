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

import { CAR_PITCH } from './rollingStock';

export const STATIONS = {
    /** Platform length: five cars, as long as Kato's 248 mm straight nearly */
    PLATFORM_LENGTH: 5 * CAR_PITCH,
    /** Platform width */
    PLATFORM_WIDTH: 14,
    /** From the track's centre line to the platform's edge, clear of the cars */
    PLATFORM_CLEARANCE: 10,
    /** Railway seconds a train stands at the platform */
    DWELL_SECONDS: 6,
    /** US cents per metre ridden, per coach */
    FARE_CENTS_PER_METRE: 50,
    /** The longest ride a fare pays for (m) */
    MAX_RIDE_METRES: 3,
} as const;
