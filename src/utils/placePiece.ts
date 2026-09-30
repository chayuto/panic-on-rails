/**
 * Laying a piece from the parts bin, by dropping it on the canvas or from
 * the keyboard: snapped to an open end near where it's put, joined to what
 * it touches, one step of undo.
 */

import { useTrackStore } from '../stores/useTrackStore';
import { useEditorStore } from '../stores/useEditorStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { useHistoryStore } from '../stores/useHistoryStore';
import { countPlacedPieces, inventoryOf } from '../data/collection';
import { getPartById } from '../data/catalog';
import { findBestSnap } from './snapManager';
import { playSound } from './audioManager';
import { isOpenEnd } from './graphAnalysis';
import { joinPlacedPiece, nodesOfPiece, openEndsOfPiece } from './joinPiece';
import { keepInView, viewCentre } from './viewFit';
import type { EdgeId, Vector2 } from '../types';

/** Where keyboard building carries on from: the piece laid last. */
let lastLaid: EdgeId | null = null;

/**
 * Lay `partId` as a drop at `at` does: snapped to an open end near it if
 * there is one, else at `at` turned `rotation`; joined to what it touches,
 * and the view keeping the new open ends in sight. In collection mode only
 * a piece still in the box. Returns the new piece's edge, or null.
 */
export function placePart(partId: string, at: Vector2, rotation: number): EdgeId | null {
    const part = getPartById(partId);
    if (!part) return null;

    // In collection mode, only pieces still in the box can be placed
    const collection = useCollectionStore.getState();
    if (collection.mode === 'collection') {
        const owned = inventoryOf(collection.ownedSets, collection.looseParts)[partId] ?? 0;
        const onTable = countPlacedPieces(useTrackStore.getState().edges)[partId] ?? 0;
        if (onTable >= owned) {
            playSound('bounce');
            return null;
        }
    }

    const track = useTrackStore.getState();
    const { selectedSystem } = useEditorStore.getState();
    const snap = findBestSnap(part, at, rotation, track.getOpenEndpoints(), selectedSystem, track.edges);

    // One gesture, one undo: the piece and its joins
    useHistoryStore.getState().record();
    const edgeId = track.addTrack(partId, snap?.ghostTransform.position ?? at, snap?.ghostTransform.rotation ?? rotation);
    if (!edgeId) return null;

    // Join every open end of the new piece (a turnout's three, a double
    // crossover's four) to the open ends it touches: a snap, or a near miss
    if (joinPlacedPiece(edgeId) > 0) playSound(selectedSystem === 'wooden' ? 'snap-wooden' : 'snap-nscale');
    // Follow the build: keep the new piece's open ends in view
    keepInView(openEndsOfPiece(edgeId));
    lastLaid = edgeId;
    return edgeId;
}

/** Which way a piece laid from the keyboard goes on from an open end: a curve turns to its side. */
export type LaySide = 'ahead' | 'left' | 'right';

/** How far beyond an open end a piece is put down, on screen (px), as a player drops one there */
const LAY_AHEAD_PX = 10;
/** And how far to one side, to turn a curve that way */
const LAY_SIDE_PX = 7;

/**
 * Lay `partId` from the keyboard: at an open end of the piece laid last, or
 * failing that the first open end there is, straight on or to `side`. With
 * no open end, in the middle of the view. Returns the new piece's edge, or
 * null.
 */
export function layPart(partId: string, side: LaySide = 'ahead'): EdgeId | null {
    const { nodes, edges } = useTrackStore.getState();
    const { zoom, userRotation } = useEditorStore.getState();
    const ends = Object.values(nodes).filter(isOpenEnd);
    const lastEnds = lastLaid && edges[lastLaid] ? nodesOfPiece(lastLaid) : new Set();
    const end = ends.find(n => lastEnds.has(n.id)) ?? ends[0];
    if (!end) return placePart(partId, viewCentre(), userRotation);

    // Just beyond the end, where it faces; to the right of that is (-sin, cos) with +Y down
    const r = (end.rotation * Math.PI) / 180;
    const ahead = LAY_AHEAD_PX / zoom;
    const beside = (side === 'left' ? -LAY_SIDE_PX : side === 'right' ? LAY_SIDE_PX : 0) / zoom;
    const at = {
        x: end.position.x + Math.cos(r) * ahead - Math.sin(r) * beside,
        y: end.position.y + Math.sin(r) * ahead + Math.cos(r) * beside,
    };
    return placePart(partId, at, userRotation);
}
