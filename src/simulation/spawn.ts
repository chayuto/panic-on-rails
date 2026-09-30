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
 * Pick the spawn spot farthest from every existing (non-crashed) train: the
 * midpoint of the edge whose midpoint maximises the distance to the nearest
 * train. Ties go to the longer edge (more room before the train meets
 * anything). Returns null when there is no track.
 */
export function pickSpawnLocation(
    edges: Record<EdgeId, TrackEdge>,
    trains: Record<TrainId, Train>,
    nodes?: Record<NodeId, TrackNode>
): SpawnLocation | null {
    const trainPositions: Vector2[] = Object.values(trains)
        .filter(t => !t.crashed && edges[t.currentEdgeId])
        .map(t => getPositionOnEdge(edges[t.currentEdgeId], t.distanceAlongEdge, nodes));

    const candidates = Object.values(edges).map(edge => {
        const mid = getPositionOnEdge(edge, edge.length / 2, nodes);
        const clearance = trainPositions.length === 0
            ? Infinity
            : Math.min(...trainPositions.map(p => Math.hypot(p.x - mid.x, p.y - mid.y)));
        return { edge, clearance };
    });

    const better = (a: typeof candidates[number], b: typeof candidates[number]) => {
        const tie = a.clearance === b.clearance || Math.abs(a.clearance - b.clearance) <= 1e-6;
        return tie ? a.edge.length > b.edge.length : a.clearance > b.clearance;
    };
    const best = candidates.reduce<typeof candidates[number] | null>(
        (acc, c) => (acc === null || better(c, acc) ? c : acc),
        null
    );
    return best ? { edgeId: best.edge.id, distance: best.edge.length / 2 } : null;
}
