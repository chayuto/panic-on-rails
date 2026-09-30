/**
 * Piers: what raised track stands on at each joint. Kato publishes the
 * heights of its supports (its starter guide's "UNITRACK Viaduct System
 * Standard Heights"), so Kato track can be raised onto them; other systems
 * have no piers in the game yet.
 */

import { getPartById } from '../data/catalog';
import type { PartBrand } from '../data/catalog/types';
import type { EdgeId, NodeId, TrackEdge, TrackNode } from '../types';
import { useTrackStore } from '../stores/useTrackStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { heightOf, HEIGHT_TOLERANCE } from './elevation';

/** A support under a joint, and how high it puts the track (mm, its roadbed's underside). */
export interface Support {
    height: number;
    name: string;
}

/**
 * Kato's supports, lowest first. The track sits 10 mm above a pier, so on
 * No.5 (50 mm) it's 60 mm up. The spacer and stairs ease ground track into
 * the climb; Kato doesn't print their heights, so these follow its 2%
 * easement (see the design doc).
 */
export const KATO_SUPPORTS: readonly Support[] = [
    { height: 0, name: 'On the baseboard' },
    { height: 5, name: 'Spacer' },
    { height: 10, name: 'Stairs' },
    { height: 25, name: 'Pier No.1' },
    { height: 35, name: 'Pier No.2' },
    { height: 45, name: 'Pier No.3' },
    { height: 55, name: 'Pier No.4' },
    { height: 60, name: 'Pier No.5' },
];

const SUPPORTS: Partial<Record<PartBrand, readonly Support[]>> = { kato: KATO_SUPPORTS };

/** The supports for the track system a joint belongs to, or none. */
export function supportsAt(node: TrackNode, edges: Record<EdgeId, TrackEdge>): readonly Support[] | null {
    for (const id of node.connections) {
        const brand = getPartById(edges[id]?.partId ?? '')?.brand;
        if (brand) return SUPPORTS[brand] ?? null;
    }
    return null;
}

/** The next support up from `height` (or down, with `direction` -1); the same height at the top or bottom. */
export function nextSupport(supports: readonly Support[], height: number, direction: 1 | -1): Support {
    if (direction > 0) {
        return supports.find(s => s.height > height + HEIGHT_TOLERANCE) ?? supports[supports.length - 1];
    }
    return [...supports].reverse().find(s => s.height < height - HEIGHT_TOLERANCE) ?? supports[0];
}

/** What a raised joint stands on, by name: a pier's, or its height if it isn't a standard one. */
export function supportName(supports: readonly Support[], node: TrackNode): string {
    const height = heightOf(node);
    return supports.find(s => Math.abs(s.height - height) <= HEIGHT_TOLERANCE)?.name ?? `${Math.round(height)} mm`;
}

/**
 * Put a joint on the next support up (or down, `direction` -1), undoably.
 * Returns the support it stands on now, or null if nothing changed: no
 * piers for its track system, or already at the top or bottom.
 */
export function raiseJoint(nodeId: NodeId, direction: 1 | -1): Support | null {
    const { nodes, edges, setNodeHeights } = useTrackStore.getState();
    const node = nodes[nodeId];
    if (!node) return null;
    const supports = supportsAt(node, edges);
    if (!supports) return null;
    const next = nextSupport(supports, heightOf(node), direction);
    if (Math.abs(next.height - heightOf(node)) <= HEIGHT_TOLERANCE) return null;
    useHistoryStore.getState().record();
    setNodeHeights({ [nodeId]: next.height });
    return next;
}

