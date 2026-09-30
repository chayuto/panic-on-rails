/**
 * What the track painter paints for the pieces on the layout: each edge in
 * its system's look, plus the infill between a double-track piece's two
 * tracks, and the piers under raised track. Pure, so it can be tested
 * without a canvas.
 */

import type { EdgeId, NodeId, PartBrand, TrackEdge, TrackGeometry, TrackNode } from '../../../types';
import { HEIGHT_TOLERANCE, heightOf } from '../../../utils/elevation';
import type { PartDefinition } from '../../../data/catalog/types';
import { isDoubleTrack } from '../../../data/catalog/helpers';
import { getPartById } from '../../../data/catalog';
import { deriveWorldGeometry } from '../../../utils/geometry';
import {
    infillBetween, C_TRACK_LOOK, EZ_TRACK_STEEL_LOOK, KATO_BRIDGE_LOOK, KATO_LOOK, KATO_SLAB_LOOK, KATO_VIADUCT_LOOK, SETRACK_LOOK,
    type ModelLook, type PaintedDeck, type PaintedEdge, type PaintedPier,
} from './trackPainter';

/** Roadbed width (mm) for parts that don't say. */
const DEFAULT_ROADBED = 25;

/** Each brand's track as it looks out of the box; Kato's for the rest. */
const BRAND_LOOKS: Partial<Record<PartBrand, ModelLook>> = {
    marklin: C_TRACK_LOOK,
    hornby: SETRACK_LOOK,
    bachmann: EZ_TRACK_STEEL_LOOK,
};

/** An edge on the layout, with where it lies and the part it belongs to. */
export interface PlacedEdge {
    edge: TrackEdge;
    geometry: TrackGeometry;
    part: PartDefinition | undefined;
    /** How high it stands along its middle (mm above the baseboard) */
    height: number;
}

/** An edge's height along its middle (mm). */
export function middleHeight(edge: TrackEdge, nodes: Record<NodeId, TrackNode>): number {
    return (heightOf(nodes[edge.startNodeId]) + heightOf(nodes[edge.endNodeId])) / 2;
}

/** A pier under every raised joint the placed edges reach. */
export function piersUnder(placed: readonly PlacedEdge[], nodes: Record<NodeId, TrackNode>): PaintedPier[] {
    const piers: PaintedPier[] = [];
    const seen = new Set<NodeId>();
    for (const { edge } of placed) {
        for (const id of [edge.startNodeId, edge.endNodeId]) {
            const node = nodes[id];
            if (!node || seen.has(id)) continue;
            seen.add(id);
            const height = heightOf(node);
            if (height > HEIGHT_TOLERANCE) piers.push({ x: node.position.x, y: node.position.y, height });
        }
    }
    return piers;
}

/** The structure a piece's track is carried on, as wide as the piece. */
function deckOf(part: PartDefinition): PaintedDeck {
    return { kind: part.deck!, width: part.width ?? DEFAULT_ROADBED, ...(part.deckColor && { color: part.deckColor }) };
}

function lookOf(part: PartDefinition | undefined): ModelLook {
    if (part?.slab) return KATO_SLAB_LOOK;
    if (part?.deck === 'viaduct') return KATO_VIADUCT_LOOK;
    if (part?.deck === 'truss') return KATO_BRIDGE_LOOK;
    return (part && BRAND_LOOKS[part.brand]) ?? KATO_LOOK;
}

export function paintedEdges(placed: readonly PlacedEdge[], selectedEdgeId: EdgeId | null, inactive: ReadonlySet<EdgeId>): PaintedEdge[] {
    const painted: PaintedEdge[] = [];
    // A double-track piece's two tracks, to lay one infill between
    const pairs = new Map<string, PlacedEdge[]>();
    for (const placedEdge of placed) {
        const { edge, geometry, part, height } = placedEdge;
        painted.push({
            geometry,
            style: part?.scale === 'wooden' ? 'wooden' : 'model',
            look: lookOf(part),
            width: part?.roadbedWidth ?? DEFAULT_ROADBED,
            roadWidth: part?.roadCrossing ? part.width : undefined,
            selected: edge.id === selectedEdgeId,
            inactive: inactive.has(edge.id),
            ...(height > 0 && { height }),
            // A double-track piece's deck is one, under both tracks: it goes on the infill
            ...(part?.deck && !isDoubleTrack(part) && { deck: deckOf(part) }),
        });
        if (part && edge.placementId && isDoubleTrack(part)) {
            const pair = pairs.get(edge.placementId);
            if (pair) pair.push(placedEdge);
            else pairs.set(edge.placementId, [placedEdge]);
        }
    }
    for (const [a, b] of pairs.values()) {
        const infill = b && infillBetween(a.geometry, b.geometry);
        if (infill) {
            painted.push({
                geometry: infill.geometry, style: 'model', look: lookOf(a.part), width: infill.width, infill: true,
                ...(a.height > 0 && { height: a.height }),
                ...(a.part?.deck && { deck: deckOf(a.part) }),
            });
        }
    }
    return painted;
}

let raisedCache: { edges: Record<EdgeId, TrackEdge>; nodes: Record<NodeId, TrackNode>; painted: PaintedEdge[] } | null = null;

/**
 * The layout's raised track, ready to paint again over the trains passing
 * under it. Worked out once per change to the track, not every frame.
 */
export function raisedTrack(edges: Record<EdgeId, TrackEdge>, nodes: Record<NodeId, TrackNode>): PaintedEdge[] {
    if (raisedCache?.edges === edges && raisedCache.nodes === nodes) return raisedCache.painted;
    const placed: PlacedEdge[] = [];
    for (const edge of Object.values(edges)) {
        const height = middleHeight(edge, nodes);
        if (height <= HEIGHT_TOLERANCE) continue;
        const geometry = deriveWorldGeometry(edge, nodes);
        if (geometry) placed.push({ edge, geometry, part: getPartById(edge.partId), height });
    }
    const painted = paintedEdges(placed, null, new Set());
    raisedCache = { edges, nodes, painted };
    return painted;
}
