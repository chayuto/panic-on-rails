/**
 * What the track painter paints for the pieces on the layout: each edge in
 * its system's look, plus the infill between a double-track piece's two
 * tracks. Pure, so it can be tested without a canvas.
 */

import type { EdgeId, PartBrand, TrackEdge, TrackGeometry } from '../../../types';
import type { PartDefinition } from '../../../data/catalog/types';
import { isDoubleTrack } from '../../../data/catalog/helpers';
import { infillBetween, C_TRACK_LOOK, KATO_LOOK, KATO_SLAB_LOOK, SETRACK_LOOK, type ModelLook, type PaintedEdge } from './trackPainter';

/** Roadbed width (mm) for parts that don't say. */
const DEFAULT_ROADBED = 25;

/** Each brand's track as it looks out of the box; Kato's for the rest. */
const BRAND_LOOKS: Partial<Record<PartBrand, ModelLook>> = {
    marklin: C_TRACK_LOOK,
    hornby: SETRACK_LOOK,
};

/** An edge on the layout, with where it lies and the part it belongs to. */
export interface PlacedEdge {
    edge: TrackEdge;
    geometry: TrackGeometry;
    part: PartDefinition | undefined;
}

function lookOf(part: PartDefinition | undefined): ModelLook {
    if (part?.slab) return KATO_SLAB_LOOK;
    return (part && BRAND_LOOKS[part.brand]) ?? KATO_LOOK;
}

export function paintedEdges(placed: readonly PlacedEdge[], selectedEdgeId: EdgeId | null, inactive: ReadonlySet<EdgeId>): PaintedEdge[] {
    const painted: PaintedEdge[] = [];
    // A double-track piece's two tracks, to lay one infill between
    const pairs = new Map<string, PlacedEdge[]>();
    for (const placedEdge of placed) {
        const { edge, geometry, part } = placedEdge;
        painted.push({
            geometry,
            style: part?.scale === 'wooden' ? 'wooden' : 'model',
            look: lookOf(part),
            width: part?.roadbedWidth ?? DEFAULT_ROADBED,
            roadWidth: part?.roadCrossing ? part.width : undefined,
            selected: edge.id === selectedEdgeId,
            inactive: inactive.has(edge.id),
        });
        if (part && edge.placementId && isDoubleTrack(part)) {
            const pair = pairs.get(edge.placementId);
            if (pair) pair.push(placedEdge);
            else pairs.set(edge.placementId, [placedEdge]);
        }
    }
    for (const [a, b] of pairs.values()) {
        const infill = b && infillBetween(a.geometry, b.geometry);
        if (infill) painted.push({ geometry: infill.geometry, style: 'model', look: lookOf(a.part), width: infill.width, infill: true });
    }
    return painted;
}
