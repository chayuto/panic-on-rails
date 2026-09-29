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

/** One edge, ready to paint. */
export interface PaintedEdge {
    geometry: TrackGeometry;
    /** Model track (ballast, sleepers, rails) or a wooden toy track (grooves) */
    style: 'model' | 'wooden';
    /** Roadbed width (mm) */
    width: number;
    /** Road-crossing plates this wide (mm) across the middle, if any */
    roadWidth?: number;
    /** Selected in the editor */
    selected?: boolean;
    /** A turnout route that is set against trains */
    inactive?: boolean;
}

/** Real N scale: 9mm gauge. The rest is tuned to read well on screen. */
export const TRACK_LOOK = {
    GAUGE: 9,
    BALLAST: '#8a867c',
    BALLAST_EDGE: '#6f6b62',
    SLEEPER: '#3e3229',
    SLEEPER_LENGTH: 16,
    SLEEPER_WIDTH: 2.4,
    SLEEPER_SPACING: 7,
    RAIL_BASE: '#5d6167',
    RAIL_BASE_WIDTH: 1.7,
    RAIL_HEAD: '#d7dbe0',
    RAIL_HEAD_WIDTH: 0.8,
    RAIL_INACTIVE: '#9a9ea4',
    ROAD: '#4a4a4a',
    ROAD_LENGTH: 34,
    ROAD_MARKING: '#d8d8d8',
    SELECTED: 'rgba(0, 255, 136, 0.45)',
    WOOD: '#d9b27c',
    WOOD_EDGE: '#a98552',
    WOOD_GROOVE: '#7a5a33',
    WOOD_GROOVE_SPACING: 20,
    WOOD_GROOVE_WIDTH: 3,
    /** Below this zoom (screen px per mm), no sleepers */
    SLEEPER_MIN_ZOOM: 0.7,
    /** Below this zoom, one line per track instead of two rails */
    RAILS_MIN_ZOOM: 0.35,
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
    const L = TRACK_LOOK;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    const wooden = all.filter(e => e.style === 'wooden');
    if (wooden.length > 0) paintWooden(ctx, wooden, px);
    const edges = wooden.length > 0 ? all.filter(e => e.style === 'model') : all;

    // 1. Roadbed, with a slightly darker shoulder
    const byWidth = new Map<number, PaintedEdge[]>();
    for (const e of edges) {
        const list = byWidth.get(e.width);
        if (list) list.push(e);
        else byWidth.set(e.width, [e]);
    }
    for (const [width, group] of byWidth) {
        strokeAll(ctx, group, width + Math.max(1.5, px), L.BALLAST_EDGE);
    }
    for (const [width, group] of byWidth) {
        strokeAll(ctx, group, width, L.BALLAST);
    }

    // 2. Road crossings: an asphalt band across the track
    for (const e of edges) {
        if (!e.roadWidth) continue;
        const m = midpoint(e.geometry);
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.heading);
        ctx.fillStyle = L.ROAD;
        ctx.fillRect(-L.ROAD_LENGTH / 2, -e.roadWidth / 2, L.ROAD_LENGTH, e.roadWidth);
        ctx.strokeStyle = L.ROAD_MARKING;
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
        if (e.selected) strokeAll(ctx, [e], e.width + 4, L.SELECTED);
    }

    // 4. Sleepers, one batched path
    if (zoom >= L.SLEEPER_MIN_ZOOM) {
        const half = L.SLEEPER_LENGTH / 2;
        ctx.beginPath();
        for (const e of edges) {
            forEachStation(e.geometry, L.SLEEPER_SPACING, (x, y, heading) => {
                // Across the track: perpendicular to the heading
                const cx = -Math.sin(heading) * half;
                const cy = Math.cos(heading) * half;
                ctx.moveTo(x - cx, y - cy);
                ctx.lineTo(x + cx, y + cy);
            });
        }
        ctx.lineWidth = L.SLEEPER_WIDTH;
        ctx.strokeStyle = L.SLEEPER;
        ctx.stroke();
    }

    // 5. Rails: routes set against trains first, so the live route draws on top
    const live = edges.filter(e => !e.inactive);
    const dead = edges.filter(e => e.inactive);
    if (zoom < L.RAILS_MIN_ZOOM) {
        strokeAll(ctx, dead, Math.max(3, 2 * px), L.RAIL_INACTIVE);
        strokeAll(ctx, live, Math.max(3, 2 * px), L.RAIL_HEAD);
        return;
    }
    const g = L.GAUGE / 2;
    for (const [group, head] of [[dead, L.RAIL_INACTIVE], [live, L.RAIL_HEAD]] as const) {
        const base = Math.max(L.RAIL_BASE_WIDTH, 1.6 * px);
        strokeAll(ctx, group, base, L.RAIL_BASE, -g);
        strokeAll(ctx, group, base, L.RAIL_BASE, g);
        const headWidth = Math.max(L.RAIL_HEAD_WIDTH, 0.8 * px);
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
