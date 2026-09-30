/**
 * Wreckage: a crashed train lies where it came to rest, blocking the track,
 * until the player clears it (and a train that runs into it crashes too).
 * Re-railing puts it back on the track, repaired: the bill came with the
 * crash.
 */

import type { EdgeId, NodeId, TrackEdge, TrackNode, Train, TrainId } from '../types';
import { getPartById } from '../data/catalog';
import { standingSpot } from './spawn';

/**
 * The wreck put back on the rails: on track of its own scale, at the
 * clearest spot where all its cars stand on the track, clear of every other
 * train and wreck, standing still with the loco leading, its throttle where the
 * driver left it. Whatever it was doing before the crash (standing at a
 * platform, reversing) is forgotten. Null if there's no such spot.
 */
export function rerail(
    wreck: Train,
    trains: Record<TrainId, Train>,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): Train | null {
    const others = { ...trains };
    delete others[wreck.id];
    const {
        crashed: _crashed, crashTime: _crashTime, trail: _trail, bounceTime: _bounceTime,
        reverseRequested: _reverse, heldAtSignal: _held, locoLeading: _locoLeading,
        dwell: _dwell, calledAt: _calledAt, ride: _ride,
        ...train
    } = wreck;

    const scale = wreck.scale ?? 'n-scale';
    const fitting = Object.fromEntries(Object.entries(edges)
        .filter(([, edge]) => (getPartById(edge.partId)?.scale ?? 'n-scale') === scale));

    const spot = standingSpot(train, fitting, edges, others, nodes);
    return spot
        ? { ...train, currentEdgeId: spot.edgeId, distanceAlongEdge: spot.distance, direction: 1, speed: 0, stopped: true }
        : null;
}
