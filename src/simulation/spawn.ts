/**
 * Spawn placement — where a newly added train should appear.
 */

import type { EdgeId, NodeId, TrackEdge, TrackNode, Train, TrainId, Vector2 } from '../types';
import { getPositionOnEdge } from '../utils/trainGeometry';

export interface SpawnLocation {
    edgeId: EdgeId;
    distance: number;
}

/**
 * Spots to put a train, best first: the middle of every edge, farthest from
 * the nearest train on the track (wrecks included) first. Ties go to the
 * longer edge (more room before the train meets anything).
 */
export function spawnCandidates(
    edges: Record<EdgeId, TrackEdge>,
    trains: Record<TrainId, Train>,
    nodes?: Record<NodeId, TrackNode>
): SpawnLocation[] {
    const trainPositions: Vector2[] = Object.values(trains)
        .filter(t => edges[t.currentEdgeId])
        .map(t => getPositionOnEdge(edges[t.currentEdgeId], t.distanceAlongEdge, nodes));

    const candidates = Object.values(edges).map(edge => {
        const mid = getPositionOnEdge(edge, edge.length / 2, nodes);
        const clearance = trainPositions.length === 0
            ? Infinity
            : Math.min(...trainPositions.map(p => Math.hypot(p.x - mid.x, p.y - mid.y)));
        return { edge, clearance };
    });

    const tie = (a: number, b: number) => a === b || Math.abs(a - b) <= 1e-6;
    return candidates
        .sort((a, b) => (tie(a.clearance, b.clearance) ? b.edge.length - a.edge.length : b.clearance - a.clearance))
        .map(({ edge }) => ({ edgeId: edge.id, distance: edge.length / 2 }));
}

/**
 * Pick the spawn spot farthest from every train on the track, wrecks
 * included: the midpoint of the edge whose midpoint maximises the distance
 * to the nearest train. Returns null when there is no track.
 */
export function pickSpawnLocation(
    edges: Record<EdgeId, TrackEdge>,
    trains: Record<TrainId, Train>,
    nodes?: Record<NodeId, TrackNode>
): SpawnLocation | null {
    return spawnCandidates(edges, trains, nodes)[0] ?? null;
}
