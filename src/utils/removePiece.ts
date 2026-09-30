/**
 * Take a piece off the layout, and what stood on it: the sensors and
 * platforms on its track, and the signals at joints that go with it (their
 * wires go with them). The track store only knows track; the cascade into
 * the logic store lives here, as joining lives in `joinPiece.ts`.
 */

import { useTrackStore } from '../stores/useTrackStore';
import { useLogicStore } from '../stores/useLogicStore';
import type { EdgeId, NodeId } from '../types';

/** Remove the piece `edgeId` belongs to (every edge placed with it), and what stood on it. */
export function removePiece(edgeId: EdgeId): void {
    const { edges, nodes } = useTrackStore.getState();
    const edge = edges[edgeId];
    if (!edge) return;

    const pieceEdges = Object.values(edges).filter(e =>
        e.id === edgeId || (!!edge.placementId && e.placementId === edge.placementId));
    const removed = new Set<EdgeId>(pieceEdges.map(e => e.id));
    // Joints the piece leaves bare: all their track goes with it
    const bare = new Set<NodeId>(pieceEdges
        .flatMap(e => [e.startNodeId, e.endNodeId])
        .filter(id => nodes[id]?.connections.every(c => removed.has(c))));

    const logic = useLogicStore.getState();
    for (const id of removed) {
        for (const sensor of logic.getSensorsOnEdge(id)) logic.removeSensor(sensor.id);
        for (const station of logic.getStationsOnEdge(id)) logic.removeStation(station.id);
    }
    for (const nodeId of bare) {
        for (const signal of logic.getSignalsAtNode(nodeId)) logic.removeSignal(signal.id);
    }

    useTrackStore.getState().removeTrack(edgeId);
}
