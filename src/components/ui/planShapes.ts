/**
 * SVG outlines of a layout plan, drawn from the same track creators that
 * build the real layout (so the preview on the box can't disagree with it).
 */

import { resolvePlan, type LayoutPlan } from '../../data/sets';
import { createPartTrack } from '../../stores/slices/trackCreators';
import type { TrackGeometry } from '../../types';

export interface PlanShapes {
    /** One SVG path per edge */
    paths: string[];
    /** One short beam across the track per buffer stop */
    bumpers: string[];
    viewBox: string;
}

/** Half-width (mm) of the beam drawn for a buffer stop. */
const BUMPER_HALF_WIDTH = 14;

function toPath(g: TrackGeometry): string {
    if (g.type === 'straight') {
        return `M ${g.start.x.toFixed(1)} ${g.start.y.toFixed(1)} L ${g.end.x.toFixed(1)} ${g.end.y.toFixed(1)}`;
    }
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const point = (deg: number) => ({
        x: g.center.x + g.radius * Math.cos(rad(deg)),
        y: g.center.y + g.radius * Math.sin(rad(deg)),
    });
    const from = point(g.startAngle);
    const to = point(g.endAngle);
    const sweep = g.endAngle - g.startAngle;
    // Increasing angles run clockwise on screen, which is SVG's sweep-flag 1
    const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
    const sweepFlag = sweep > 0 ? 1 : 0;
    return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} A ${g.radius} ${g.radius} 0 ${largeArc} ${sweepFlag} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

export function planShapes(plan: LayoutPlan, padding = 40): PlanShapes {
    const resolved = resolvePlan(plan);
    const built = resolved.pieces.map(p => createPartTrack(p.part, p.position, p.rotation));
    const geometries = built.flatMap(b => b.edges.map(e => e.geometry));
    const bumpers = built.flatMap(b => b.nodes.filter(n => n.bumper)).map(n => {
        const a = (n.rotation + 90) * Math.PI / 180;
        const dx = Math.cos(a) * BUMPER_HALF_WIDTH;
        const dy = Math.sin(a) * BUMPER_HALF_WIDTH;
        return `M ${(n.position.x - dx).toFixed(1)} ${(n.position.y - dy).toFixed(1)} L ${(n.position.x + dx).toFixed(1)} ${(n.position.y + dy).toFixed(1)}`;
    });

    // Bounds include arc bulges, so sample arcs rather than trusting connectors
    const xs: number[] = [];
    const ys: number[] = [];
    for (const g of geometries) {
        if (g.type === 'straight') {
            xs.push(g.start.x, g.end.x);
            ys.push(g.start.y, g.end.y);
        } else {
            for (let i = 0; i <= 8; i++) {
                const a = ((g.startAngle + ((g.endAngle - g.startAngle) * i) / 8) * Math.PI) / 180;
                xs.push(g.center.x + g.radius * Math.cos(a));
                ys.push(g.center.y + g.radius * Math.sin(a));
            }
        }
    }
    const minX = Math.min(...xs) - padding;
    const minY = Math.min(...ys) - padding;
    const width = Math.max(...xs) - Math.min(...xs) + padding * 2;
    const height = Math.max(...ys) - Math.min(...ys) + padding * 2;

    return {
        paths: geometries.map(toPath),
        bumpers,
        viewBox: `${minX.toFixed(1)} ${minY.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`,
    };
}
