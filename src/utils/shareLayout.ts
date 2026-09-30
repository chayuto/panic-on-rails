/**
 * Share a layout by URL: every piece on the table as its part, position and
 * rotation, compressed into the link's fragment (`#layout=v1.…`). Opening
 * the link builds the pieces through the normal template path, which joins
 * them again. The link carries track only, not trains or wiring.
 */

import { getPartById } from '../data/catalog';
import { createPartTrack } from '../stores/slices/trackCreators';
import { deriveWorldGeometry, normalizeAngle } from './geometry';
import type { EdgeId, NodeId, TrackEdge, TrackGeometry, TrackNode, Vector2 } from '../types';
import type { TemplatePart, TrackTemplate } from '../data/templates/types';

const FORMAT = 'v1';
export const LAYOUT_PARAM = 'layout';

/** The two ends of a piece of track. */
function endsOf(g: TrackGeometry): [Vector2, Vector2] {
    if (g.type === 'straight') return [g.start, g.end];
    const at = (deg: number) => ({
        x: g.center.x + g.radius * Math.cos((deg * Math.PI) / 180),
        y: g.center.y + g.radius * Math.sin((deg * Math.PI) / 180),
    });
    return [at(g.startAngle), at(g.endAngle)];
}

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

/**
 * Each piece on the table as its part, position and rotation. The graph
 * doesn't keep where a piece was placed, so this builds the part at the
 * origin and finds the turn and shift that land its first edge on the
 * piece's first edge.
 */
export function layoutPieces(edges: Record<EdgeId, TrackEdge>, nodes: Record<NodeId, TrackNode>): TemplatePart[] {
    // Every edge of a piece shares its placementId, in the order they were built
    const pieces = new Map<string, TrackEdge>();
    for (const edge of Object.values(edges)) {
        const key = edge.placementId ?? edge.id;
        if (!pieces.has(key)) pieces.set(key, edge);
    }

    const out: TemplatePart[] = [];
    for (const first of pieces.values()) {
        const part = getPartById(first.partId);
        const world = deriveWorldGeometry(first, nodes) ?? first.geometry;
        if (!part || !world) continue;
        const reference = createPartTrack(part, { x: 0, y: 0 }, 0).edges[0];
        if (!reference) continue;

        const [r0, r1] = endsOf(reference.geometry);
        const [w0, w1] = endsOf(world);
        const turn = Math.atan2(w1.y - w0.y, w1.x - w0.x) - Math.atan2(r1.y - r0.y, r1.x - r0.x);
        const cos = Math.cos(turn);
        const sin = Math.sin(turn);
        out.push({
            partId: part.id,
            position: {
                x: round(w0.x - (r0.x * cos - r0.y * sin), 2),
                y: round(w0.y - (r0.x * sin + r0.y * cos), 2),
            },
            rotation: round(normalizeAngle((turn * 180) / Math.PI), 4),
        });
    }
    return out;
}

async function deflate(text: string): Promise<Uint8Array> {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
    const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return Uint8Array.from(binary, c => c.charCodeAt(0));
}

/** Pieces as a short code for a link: part ids once, then [part, x, y, rotation] per piece. */
export async function encodeLayout(pieces: TemplatePart[]): Promise<string> {
    const ids = [...new Set(pieces.map(p => p.partId))];
    const payload = {
        p: ids,
        l: pieces.map(p => [ids.indexOf(p.partId), p.position.x, p.position.y, p.rotation]),
    };
    return `${FORMAT}.${toBase64Url(await deflate(JSON.stringify(payload)))}`;
}

export class SharedLayoutError extends Error {}

/** The pieces in a code from `encodeLayout`. Throws `SharedLayoutError` if it can't be read. */
export async function decodeLayout(code: string): Promise<TemplatePart[]> {
    const [format, data] = code.split('.');
    if (format !== FORMAT || !data) throw new SharedLayoutError('This link was made by a different version of the game.');
    let payload: { p?: unknown; l?: unknown };
    try {
        payload = JSON.parse(await inflate(fromBase64Url(data)));
    } catch {
        throw new SharedLayoutError("This link's layout is damaged: it may have been cut short.");
    }
    const ids = payload.p;
    const rows = payload.l;
    if (!Array.isArray(ids) || !Array.isArray(rows)) throw new SharedLayoutError("This link's layout is damaged.");
    const pieces: TemplatePart[] = [];
    for (const row of rows) {
        if (!Array.isArray(row) || row.length !== 4 || !row.every(n => typeof n === 'number' && Number.isFinite(n))) {
            throw new SharedLayoutError("This link's layout is damaged.");
        }
        const partId = ids[row[0]];
        if (typeof partId !== 'string' || !getPartById(partId)) {
            throw new SharedLayoutError(`This link uses a piece this version doesn't have (${String(partId)}).`);
        }
        pieces.push({ partId, position: { x: row[1], y: row[2] }, rotation: row[3] });
    }
    return pieces;
}

/** A template that builds shared pieces exactly where they were. */
export function sharedLayoutTemplate(pieces: TemplatePart[]): TrackTemplate {
    return {
        version: 2,
        template: {
            id: 'shared-layout',
            name: 'Shared layout',
            description: 'A layout opened from a link',
            difficulty: 'beginner',
            system: getPartById(pieces[0]?.partId ?? '')?.scale ?? 'n-scale',
            estimatedCost: pieces.reduce((sum, p) => sum + (getPartById(p.partId)?.cost ?? 0), 0),
            partCount: pieces.length,
            trainCount: 0,
        },
        parts: pieces,
        trains: [],
        // Positions are kept to 0.01mm: only connectors that truly meet join
        connectThreshold: 1,
    };
}

/** The link to a layout, on this page. */
export function shareUrl(code: string, location: { origin: string; pathname: string }): string {
    return `${location.origin}${location.pathname}#${LAYOUT_PARAM}=${code}`;
}

/** The code in a page's fragment, if it carries a layout. */
export function layoutCodeIn(hash: string): string | null {
    const match = hash.match(new RegExp(`[#&]${LAYOUT_PARAM}=([^&]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}
