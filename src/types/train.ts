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
    speed: number; // pixels per second
    color: string;
    // Bounce animation state
    bounceTime?: number;    // Timestamp when bounce started (performance.now())
    // Crash state
    crashed?: boolean;      // True if train has crashed
    crashTime?: number;     // Timestamp when crash occurred
    // Multi-car train properties
    carriageCount?: number;    // Number of carriages (default 1 = locomotive only)
    carriageSpacing?: number;  // Distance between carriage centers in pixels (default 30)
}
