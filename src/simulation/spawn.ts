/**
 * Spawn placement — where a newly added train should appear.
 */

import type { EdgeId, NodeId, TrackEdge, TrackNode, Train, TrainId, Vector2 } from '../types';
import { getPositionOnEdge } from '../utils/trainGeometry';
import { fitsOnTrack, getCarPoses, trainReach } from '../utils/trainCars';
import { detectCollisions } from '../utils/collisionManager';

export interface SpawnLocation {
    edgeId: EdgeId;
    distance: number;
}

/**
 * Spots to put a train, best first: the middle of every edge, farthest from
 * the nearest car on the track (wrecks included) first. Ties go to the
 * longer edge (more room before the train meets anything).
 */
export function spawnCandidates(
    edges: Record<EdgeId, TrackEdge>,
    trains: Record<TrainId, Train>,
    nodes?: Record<NodeId, TrackNode>
): SpawnLocation[] {
    // Every car, not just the front: a long train fills a lot of track
    const trainPositions: Vector2[] = Object.values(trains)
        .filter(t => edges[t.currentEdgeId])
        .flatMap(t => {
            const cars = nodes ? getCarPoses(t, edges, nodes) : [];
            return cars.length > 0 ? cars : [getPositionOnEdge(edges[t.currentEdgeId], t.distanceAlongEdge, nodes)];
        });

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

/**
 * Where `train` can stand: the clearest spot on one of `candidates` (edges
 * of its scale) where every car is on the track and none fouls another
 * train or a wreck. Every edge's middle first, clearest first; failing
 * those, every edge's far end, the front of the train at a buffer. Null when
 * the train is longer than any stretch of the track, or there's no room.
 */
export function standingSpot(
    train: Train,
    candidates: Record<EdgeId, TrackEdge>,
    edges: Record<EdgeId, TrackEdge>,
    trains: Record<TrainId, Train>,
    nodes: Record<NodeId, TrackNode>
): SpawnLocation | null {
    const middles = spawnCandidates(candidates, trains, nodes);
    const { ahead } = trainReach(train);
    const ends = middles.map(spot => ({ edgeId: spot.edgeId, distance: Math.max(0, candidates[spot.edgeId].length - ahead) }));
    for (const spot of [...middles, ...ends]) {
        const { trail: _trail, ...rest } = train;
        const placed: Train = { ...rest, currentEdgeId: spot.edgeId, distanceAlongEdge: spot.distance, direction: 1 };
        if (!fitsOnTrack(placed, edges, nodes)) continue;
        const fouls = detectCollisions({ ...trains, [placed.id]: placed }, edges, nodes)
            .some(c => c.trainA.id === placed.id || c.trainB.id === placed.id);
        if (!fouls) return spot;
    }
    return null;
}
