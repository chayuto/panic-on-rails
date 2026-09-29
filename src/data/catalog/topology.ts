/**
 * Topology parts: walk each route's straights and arcs from its connector,
 * in the part's own coordinates (mm, 0° = east, +Y down, angles clockwise).
 *
 * The walk gives every connector's position and facade, and every segment
 * of track between them. The connector model (snapping) and the track
 * creator (placing) both use it, so they can't disagree.
 */

import type { TopologyGeometry, TopologyStep } from './types';

/** Routes that should meet must meet within this (mm / degrees). */
const MEET_TOLERANCE_MM = 0.5;
const MEET_TOLERANCE_DEG = 0.5;

export interface Pose {
    x: number;
    y: number;
    /** Direction of travel along the route (degrees) */
    heading: number;
}

export interface TopologyConnector {
    id: string;
    x: number;
    y: number;
    /** Direction the connector faces, out of the piece (degrees, [0, 360)) */
    facade: number;
    /** Indices of the routes that start or end here, in listed order */
    routes: number[];
}

/** One piece of track between two points of the part. */
export interface TopologySegment {
    route: number;
    step: number;
    start: Pose;
    end: Pose;
    track: TopologyStep;
    /** Connector id at the start/end, or undefined for a point inside the route */
    fromConnector?: string;
    toConnector?: string;
}

export interface ResolvedTopology {
    connectors: TopologyConnector[];
    segments: TopologySegment[];
    /** The first connector listed: where the part is placed from */
    primary: string;
}

export class TopologyError extends Error {
    constructor(message: string) {
        super(`Topology: ${message}`);
        this.name = 'TopologyError';
    }
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;
const rad = (deg: number) => (deg * Math.PI) / 180;
const angleGap = (a: number, b: number) => {
    const d = Math.abs(norm(a) - norm(b));
    return d > 180 ? 360 - d : d;
};

/** Where one step of track, started at `from`, ends. */
export function advance(from: Pose, step: TopologyStep): Pose {
    if ('straight' in step) {
        return {
            x: from.x + Math.cos(rad(from.heading)) * step.straight,
            y: from.y + Math.sin(rad(from.heading)) * step.straight,
            heading: from.heading,
        };
    }
    // Turning right (clockwise on screen, +Y down) puts the centre on the right
    const side = step.turn === 'right' ? 1 : -1;
    const toCentre = rad(from.heading + side * 90);
    const cx = from.x + Math.cos(toCentre) * step.arc;
    const cy = from.y + Math.sin(toCentre) * step.arc;
    const startAngle = from.heading - side * 90;
    const endAngle = startAngle + side * step.angle;
    return {
        x: cx + Math.cos(rad(endAngle)) * step.arc,
        y: cy + Math.sin(rad(endAngle)) * step.arc,
        heading: from.heading + side * step.angle,
    };
}

/** Walk every route of a topology part and check that the routes meet. */
export function resolveTopology(geometry: TopologyGeometry): ResolvedTopology {
    const connectors = new Map<string, TopologyConnector>();
    for (const [id, c] of Object.entries(geometry.connectors)) {
        connectors.set(id, { id, x: c.x, y: c.y, facade: norm(c.heading + 180), routes: [] });
    }
    const primary = Object.keys(geometry.connectors)[0];
    if (!primary) throw new TopologyError('a part needs at least one connector');

    const segments: TopologySegment[] = [];
    geometry.routes.forEach((route, r) => {
        const start = connectors.get(route.from);
        if (!start) throw new TopologyError(`route ${r} starts at unknown connector "${route.from}"`);
        if (route.path.length === 0) throw new TopologyError(`route ${r} has no track`);
        start.routes.push(r);

        let pose: Pose = { x: start.x, y: start.y, heading: norm(start.facade + 180) };
        route.path.forEach((step, s) => {
            const end = advance(pose, step);
            segments.push({
                route: r,
                step: s,
                start: pose,
                end,
                track: step,
                fromConnector: s === 0 ? route.from : undefined,
                toConnector: s === route.path.length - 1 ? route.to : undefined,
            });
            pose = end;
        });

        const existing = connectors.get(route.to);
        if (existing) {
            const gap = Math.hypot(existing.x - pose.x, existing.y - pose.y);
            if (gap > MEET_TOLERANCE_MM) {
                throw new TopologyError(`route ${r} ends ${gap.toFixed(2)} mm from connector "${route.to}"`);
            }
            if (angleGap(existing.facade, pose.heading) > MEET_TOLERANCE_DEG) {
                throw new TopologyError(`route ${r} arrives at "${route.to}" heading ${norm(pose.heading).toFixed(2)}°, but it faces ${existing.facade.toFixed(2)}°`);
            }
            existing.routes.push(r);
        } else {
            connectors.set(route.to, { id: route.to, x: pose.x, y: pose.y, facade: norm(pose.heading), routes: [r] });
        }
    });

    for (const c of connectors.values()) {
        if (c.routes.length === 0) throw new TopologyError(`connector "${c.id}" has no route`);
        if (c.routes.length > 2) throw new TopologyError(`connector "${c.id}" has ${c.routes.length} routes; points have two positions`);
    }

    const linked = new Set<string>();
    for (const group of geometry.points ?? []) {
        for (const id of group) {
            const c = connectors.get(id);
            if (!c || c.routes.length !== 2) throw new TopologyError(`linked points name "${id}", which is not a set of points`);
            if (linked.has(id)) throw new TopologyError(`points "${id}" are linked twice`);
            linked.add(id);
        }
    }

    return { connectors: [...connectors.values()], segments, primary };
}

/** Length of one step of track (mm). */
export function stepLength(step: TopologyStep): number {
    return 'straight' in step ? step.straight : step.arc * rad(step.angle);
}
