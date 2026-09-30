/**
 * Track painter: draws every visible piece of track in one pass, the way
 * the real product looks — ballasted roadbed, sleepers, two rails.
 *
 * One Konva shape calls this, instead of ~17 Konva shapes per piece, so a
 * thousand-piece layout draws in a couple of milliseconds. Detail follows
 * the zoom: sleepers only when they're big enough to see, a single line
 * per track when zoomed far out. See docs/ROADMAP.md (Phase 5) for the
 * measurements behind these choices.
 */

import type { TrackGeometry } from '../../../types';
import { angleDifference } from '../../../utils/angle';

/** One edge, ready to paint. */
export interface PaintedEdge {
    geometry: TrackGeometry;
    /** Model track (ballast, sleepers, rails) or a wooden toy track (grooves) */
    style: 'model' | 'wooden';
    /** How this model track system looks (default: Kato Unitrack) */
    look?: ModelLook;
    /** Roadbed width (mm) */
    width: number;
    /** Road-crossing plates this wide (mm) across the middle, if any */
    roadWidth?: number;
    /** Selected in the editor */
    selected?: boolean;
    /** A turnout route that is set against trains */
    inactive?: boolean;
    /**
     * Roadbed only, no sleepers or rails: the infill between a double-track
     * piece's two tracks, along its middle, so the pair is one band
     */
    infill?: boolean;
}

/**
 * The infill between a double-track piece's two tracks: along their middle,
 * as wide as they are apart. Null unless the two run side by side (parallel
 * straights, or concentric arcs over the same angle).
 */
export function infillBetween(a: TrackGeometry, b: TrackGeometry): { geometry: TrackGeometry; width: number } | null {
    const mid = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    if (a.type === 'straight' && b.type === 'straight') {
        const width = Math.hypot(b.start.x - a.start.x, b.start.y - a.start.y);
        const apartAtEnd = Math.hypot(b.end.x - a.end.x, b.end.y - a.end.y);
        if (Math.abs(width - apartAtEnd) > 0.5) return null;
        return { geometry: { type: 'straight', start: mid(a.start, b.start), end: mid(a.end, b.end) }, width };
    }
    if (a.type === 'arc' && b.type === 'arc') {
        const concentric = Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y) < 0.5;
        const sweep = (g: typeof a) => g.endAngle - g.startAngle;
        const sameSweep = angleDifference(a.startAngle, b.startAngle) < 0.5 && Math.abs(sweep(a) - sweep(b)) < 0.5;
        if (!concentric || !sameSweep) return null;
        return { geometry: { ...a, radius: (a.radius + b.radius) / 2 }, width: Math.abs(a.radius - b.radius) };
    }
    return null;
}

/** How one system of model track looks, in mm. */
export interface ModelLook {
    /** Between the rails */
    gauge: number;
    /** Roadbed colour; null for sleepers laid straight on the baseboard */
    ballast: string | null;
    ballastEdge: string;
    sleeper: string;
    sleeperLength: number;
    sleeperWidth: number;
    sleeperSpacing: number;
    railBase: string;
    railBaseWidth: number;
    railHead: string;
    railHeadWidth: number;
    railInactive: string;
    /** Märklin's centre studs, the third rail of its AC system: one per sleeper */
    studs?: string;
}

/** Kato Unitrack (N): real 9mm gauge; the rest is tuned to read well on screen. */
export const KATO_LOOK: ModelLook = {
    gauge: 9,
    ballast: '#8a867c',
    ballastEdge: '#6f6b62',
    sleeper: '#3e3229',
    sleeperLength: 16,
    sleeperWidth: 2.4,
    sleeperSpacing: 7,
    railBase: '#5d6167',
    railBaseWidth: 1.7,
    railHead: '#d7dbe0',
    railHeadWidth: 0.8,
    railInactive: '#9a9ea4',
};

/** Märklin C-track (H0): grey moulded roadbed, and studs down the middle. */
export const C_TRACK_LOOK: ModelLook = {
    gauge: 16.5,
    ballast: '#7c7b76',
    ballastEdge: '#5f5e5a',
    sleeper: '#3a332d',
    sleeperLength: 30,
    sleeperWidth: 4.2,
    sleeperSpacing: 12,
    railBase: '#5d6167',
    railBaseWidth: 3,
    railHead: '#d7dbe0',
    railHeadWidth: 1.4,
    railInactive: '#9a9ea4',
    studs: '#c3c7cc',
};

/** Hornby Setrack (OO): black plastic sleepers straight on the baseboard (lifted a little to read on screen). */
export const SETRACK_LOOK: ModelLook = {
    gauge: 16.5,
    ballast: null,
    ballastEdge: '#1f1c1a',
    sleeper: '#4a423b',
    sleeperLength: 32,
    sleeperWidth: 4.4,
    sleeperSpacing: 12.5,
    railBase: '#6a6e72',
    railBaseWidth: 3,
    railHead: '#d9dcdf',
    railHeadWidth: 1.4,
    railInactive: '#9a9ea4',
};

/** Shared colours and the zoom levels detail appears at. */
export const TRACK_LOOK = {
    ROAD: '#4a4a4a',
    ROAD_LENGTH: 34,
    ROAD_MARKING: '#d8d8d8',
    SELECTED: 'rgba(0, 255, 136, 0.45)',
    WOOD: '#d9b27c',
    WOOD_EDGE: '#a98552',
    WOOD_GROOVE: '#7a5a33',
    WOOD_GROOVE_SPACING: 20,
    WOOD_GROOVE_WIDTH: 3,
    /** Sleepers show once they're this many screen pixels apart */
    SLEEPER_MIN_PX: 4.9,
    /** Two rails once they're this many screen pixels apart; one line below */
    RAILS_MIN_PX: 3.15,
} as const;

type Ctx = CanvasRenderingContext2D;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Trace an edge's centreline, offset sideways by `offset` mm (right of travel = +). */
function tracePath(ctx: Ctx, g: TrackGeometry, offset = 0): void {
    if (g.type === 'straight') {
        const dx = g.end.x - g.start.x;
        const dy = g.end.y - g.start.y;
        const len = Math.hypot(dx, dy) || 1;
        // Right of travel on screen (+Y down) is (-dy, dx)
        const ox = (-dy / len) * offset;
        const oy = (dx / len) * offset;
        ctx.moveTo(g.start.x + ox, g.start.y + oy);
        ctx.lineTo(g.end.x + ox, g.end.y + oy);
        return;
    }
    const sweep = g.endAngle - g.startAngle;
    // Increasing angles run clockwise on screen, so right of travel is inward
    const r = g.radius + (sweep >= 0 ? -offset : offset);
    const a0 = rad(g.startAngle);
    ctx.moveTo(g.center.x + r * Math.cos(a0), g.center.y + r * Math.sin(a0));
    ctx.arc(g.center.x, g.center.y, r, a0, rad(g.endAngle), sweep < 0);
}

/** Visit points along an edge every `step` mm, with the travel heading (radians). */
function forEachStation(g: TrackGeometry, step: number, visit: (x: number, y: number, heading: number) => void): void {
    if (g.type === 'straight') {
        const dx = g.end.x - g.start.x;
        const dy = g.end.y - g.start.y;
        const len = Math.hypot(dx, dy);
        const heading = Math.atan2(dy, dx);
        const n = Math.max(1, Math.round(len / step));
        for (let i = 0; i < n; i++) {
            const t = (i + 0.5) / n;
            visit(g.start.x + dx * t, g.start.y + dy * t, heading);
        }
        return;
    }
    const sweep = g.endAngle - g.startAngle;
    const len = g.radius * Math.abs(rad(sweep));
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) {
        const a = rad(g.startAngle + (sweep * (i + 0.5)) / n);
        const heading = a + (sweep >= 0 ? Math.PI / 2 : -Math.PI / 2);
        visit(g.center.x + g.radius * Math.cos(a), g.center.y + g.radius * Math.sin(a), heading);
    }
}

/** Middle of an edge and its heading there. */
function midpoint(g: TrackGeometry): { x: number; y: number; heading: number } {
    if (g.type === 'straight') {
        return {
            x: (g.start.x + g.end.x) / 2,
            y: (g.start.y + g.end.y) / 2,
            heading: Math.atan2(g.end.y - g.start.y, g.end.x - g.start.x),
        };
    }
    const sweep = g.endAngle - g.startAngle;
    const a = rad(g.startAngle + sweep / 2);
    return {
        x: g.center.x + g.radius * Math.cos(a),
        y: g.center.y + g.radius * Math.sin(a),
        heading: a + (sweep >= 0 ? Math.PI / 2 : -Math.PI / 2),
    };
}

function strokeAll(ctx: Ctx, edges: PaintedEdge[], width: number, color: string, offset = 0): void {
    if (edges.length === 0) return;
    ctx.beginPath();
    for (const e of edges) tracePath(ctx, e.geometry, offset);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
}

/**
 * Paint the track. `zoom` is screen pixels per mm; widths never drop below
 * `minPx` screen pixels so thin rails stay visible when zoomed out.
 */
export function paintTrack(ctx: Ctx, all: PaintedEdge[], zoom: number): void {
    const px = 1 / Math.max(zoom, 0.01);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    const wooden = all.filter(e => e.style === 'wooden');
    if (wooden.length > 0) paintWooden(ctx, wooden, px);

    // Each system of model track in its own look, a few batched passes each
    const byLook = new Map<ModelLook, PaintedEdge[]>();
    for (const e of all) {
        if (e.style !== 'model') continue;
        const look = e.look ?? KATO_LOOK;
        const list = byLook.get(look);
        if (list) list.push(e);
        else byLook.set(look, [e]);
    }
    for (const [look, edges] of byLook) paintModel(ctx, edges, look, zoom, px);
}

function paintModel(ctx: Ctx, all: PaintedEdge[], L: ModelLook, zoom: number, px: number): void {
    // Infill is roadbed only; everything after the roadbed is the tracks'
    const edges = all.filter(e => !e.infill);

    // 1. Roadbed, with a slightly darker shoulder
    if (L.ballast) {
        const byWidth = new Map<number, PaintedEdge[]>();
        for (const e of all) {
            const list = byWidth.get(e.width);
            if (list) list.push(e);
            else byWidth.set(e.width, [e]);
        }
        for (const [width, group] of byWidth) {
            strokeAll(ctx, group, width + Math.max(1.5, px), L.ballastEdge);
        }
        for (const [width, group] of byWidth) {
            strokeAll(ctx, group, width, L.ballast);
        }
    }

    // 2. Road crossings: an asphalt band across the track
    for (const e of edges) {
        if (!e.roadWidth) continue;
        const m = midpoint(e.geometry);
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.heading);
        ctx.fillStyle = TRACK_LOOK.ROAD;
        ctx.fillRect(-TRACK_LOOK.ROAD_LENGTH / 2, -e.roadWidth / 2, TRACK_LOOK.ROAD_LENGTH, e.roadWidth);
        ctx.strokeStyle = TRACK_LOOK.ROAD_MARKING;
        ctx.lineWidth = Math.max(0.8, px);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, -e.roadWidth / 2);
        ctx.lineTo(0, e.roadWidth / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // 3. Selection highlight over the roadbed
    for (const e of edges) {
        if (e.selected) strokeAll(ctx, [e], e.width + 4, TRACK_LOOK.SELECTED);
    }

    // 4. Sleepers, one batched path, once they're far enough apart to see
    if (zoom * L.sleeperSpacing >= TRACK_LOOK.SLEEPER_MIN_PX) {
        const half = L.sleeperLength / 2;
        ctx.beginPath();
        for (const e of edges) {
            forEachStation(e.geometry, L.sleeperSpacing, (x, y, heading) => {
                // Across the track: perpendicular to the heading
                const cx = -Math.sin(heading) * half;
                const cy = Math.cos(heading) * half;
                ctx.moveTo(x - cx, y - cy);
                ctx.lineTo(x + cx, y + cy);
            });
        }
        ctx.lineWidth = L.sleeperWidth;
        ctx.strokeStyle = L.sleeper;
        ctx.stroke();

        // Märklin's centre studs sit on the sleepers, between the rails
        if (L.studs) {
            ctx.beginPath();
            for (const e of edges) {
                forEachStation(e.geometry, L.sleeperSpacing, (x, y) => {
                    ctx.moveTo(x + 1.1, y);
                    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
                });
            }
            ctx.fillStyle = L.studs;
            ctx.fill();
        }
    }

    // 5. Rails: routes set against trains first, so the live route draws on top
    const live = edges.filter(e => !e.inactive);
    const dead = edges.filter(e => e.inactive);
    if (zoom * L.gauge < TRACK_LOOK.RAILS_MIN_PX) {
        strokeAll(ctx, dead, Math.max(3, 2 * px), L.railInactive);
        strokeAll(ctx, live, Math.max(3, 2 * px), L.railHead);
        return;
    }
    const g = L.gauge / 2;
    for (const [group, head] of [[dead, L.railInactive], [live, L.railHead]] as const) {
        const base = Math.max(L.railBaseWidth, 1.6 * px);
        strokeAll(ctx, group, base, L.railBase, -g);
        strokeAll(ctx, group, base, L.railBase, g);
        const headWidth = Math.max(L.railHeadWidth, 0.8 * px);
        strokeAll(ctx, group, headWidth, head, -g);
        strokeAll(ctx, group, headWidth, head, g);
    }
}

/** Wooden toy track (Brio, IKEA): a wide plank with two grooves. */
function paintWooden(ctx: Ctx, edges: PaintedEdge[], px: number): void {
    const L = TRACK_LOOK;
    for (const e of edges) strokeAll(ctx, [e], e.width + Math.max(1.5, px), L.WOOD_EDGE);
    for (const e of edges) strokeAll(ctx, [e], e.width, L.WOOD);
    for (const e of edges.filter(e => e.selected)) strokeAll(ctx, [e], e.width + 4, L.SELECTED);
    const g = L.WOOD_GROOVE_SPACING / 2;
    const live = edges.filter(e => !e.inactive);
    const dead = edges.filter(e => e.inactive);
    for (const [group, alpha] of [[dead, 0.45], [live, 1]] as const) {
        ctx.globalAlpha = alpha;
        strokeAll(ctx, group, Math.max(L.WOOD_GROOVE_WIDTH, px), L.WOOD_GROOVE, -g);
        strokeAll(ctx, group, Math.max(L.WOOD_GROOVE_WIDTH, px), L.WOOD_GROOVE, g);
    }
    ctx.globalAlpha = 1;
}
