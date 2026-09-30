/**
 * Throwing a set of points, as the player does, by a click or a key. Points
 * are locked while a train stands on them: moving them under it would split
 * the train. The lock counts every car, not only the front one.
 */

import { useTrackStore } from '../stores/useTrackStore';
import { useSimulationStore } from '../stores/useSimulationStore';
import { useEffectsStore } from '../stores/useEffectsStore';
import { playSound, playSwitchSound } from './audioManager';
import { edgesUnder } from './trainCars';
import type { EdgeId, NodeId, TrackEdge, TrackNode, Train } from '../types';

/**
 * Whether a train stands on the points at `nodeId`: any car of a train (not
 * a wreck) on one of their routes. The track leading up to them doesn't
 * count, so points can still be thrown in front of a train.
 */
export function pointsOccupied(
    nodeId: NodeId,
    trains: Record<string, Train>,
    edges: Record<EdgeId, TrackEdge>,
    nodes: Record<NodeId, TrackNode>
): boolean {
    const node = nodes[nodeId];
    if (!node) return false;
    const routes = new Set(node.switchBranches ?? node.connections);
    return Object.values(trains).some(t => !t.crashed && edgesUnder(t, edges, nodes).some(id => routes.has(id)));
}

/**
 * Throw the points at `nodeId`, with their sound and a ripple; refused, with
 * a thud and a red ripple, while a train stands on them. Returns whether
 * they moved.
 */
export function throwPoints(nodeId: NodeId): boolean {
    const { nodes, edges, toggleSwitch } = useTrackStore.getState();
    const node = nodes[nodeId];
    if (!node || node.type !== 'switch') return false;
    const { triggerRipple } = useEffectsStore.getState();
    if (pointsOccupied(nodeId, useSimulationStore.getState().trains, edges, nodes)) {
        playSound('bounce');
        triggerRipple(node.position, { color: '#FF4444' });
        return false;
    }
    toggleSwitch(nodeId);
    playSwitchSound('n-scale');
    triggerRipple(node.position, { color: '#FFD93D' });
    return true;
}
