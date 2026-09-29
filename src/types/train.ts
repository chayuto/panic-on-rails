/**
 * Entity Types
 */

import type { TrainId, EdgeId } from './common';

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
    color: string;
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
    carriageSpacing?: number;  // Distance between consecutive cars' front bogies (mm, default CAR_PITCH)
    /** Edges the train came through, most recent first, for placing its cars */
    trail?: EdgeId[];
}
