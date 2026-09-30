/**
 * Entity Types
 */

import type { TrainId, EdgeId } from './common';
import type { StationId } from './logic';
import type { PartScale } from '../data/catalog/types';

/** A train moving along the track graph */
export interface Train {
    id: TrainId;
    currentEdgeId: EdgeId;
    distanceAlongEdge: number; // 0 to edge.length
    direction: 1 | -1;
    speed: number; // current speed, model mm/s
    /** Speed the driver has set (mm/s). Missing: hold the current speed. */
    throttle?: number;
    /** Stop, then set off the other way (the power pack's direction lever) */
    reverseRequested?: boolean;
    /** False when the locomotive is at the back, pushing (after turning back). Default true. */
    locoLeading?: boolean;
    color: string;
    /** Which rolling stock this is (see data/rollingStock); none for free-build trains */
    stockId?: string;
    /** The scale it's built to: its size and speeds (config/scales). Missing: N. */
    scale?: PartScale;
    // Bounce animation state
    bounceTime?: number;    // Timestamp when bounce started (performance.now())
    // Control state
    stopped?: boolean;      // Held by the player (stop/go control)
    heldAtSignal?: boolean; // Standing at a red signal's stop line
    // Crash state
    crashed?: boolean;      // True if train has crashed
    crashTime?: number;     // Timestamp when crash occurred
    // Multi-car train properties
    carriageCount?: number;    // Number of carriages (default 1 = locomotive only)
    /**
     * Each car's length over its couplers (mm), locomotive first: the
     * model's own. Without it the train is `carriageCount` short uniform
     * cars, `carriageSpacing` apart.
     */
    carLengths?: number[];
    carriageSpacing?: number;  // Distance between consecutive cars' front bogies (mm, default CAR_PITCH)
    /** Edges the train came through, most recent first, for placing its cars */
    trail?: EdgeId[];
    // Station stops
    /** Railway seconds left standing at a platform */
    dwell?: number;
    /** The station it's calling at or just called at, so it doesn't stop there again at once */
    calledAt?: StationId;
    /** Model mm run since its last station stop: the passengers' ride, for the fare */
    ride?: number;
}
