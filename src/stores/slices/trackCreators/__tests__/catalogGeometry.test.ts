/**
 * Catalog geometry invariants — every part in every catalog.
 *
 * The same part geometry is described in three places: the connector model
 * (snapping/ghost), the track creators (what gets placed), and
 * deriveWorldGeometry (what moved/re-connected edges become). These tests
 * pin them to each other so a part can't snap one way and build another.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getAllParts } from '../../../../data/catalog/registry';
import { getWorldConnectors } from '../../../../utils/snapManager';
import { getPartConnectors } from '../../../../data/catalog/helpers';
import { deriveWorldGeometry } from '../../../../utils/geometry';
import { useTrackStore } from '../../../useTrackStore';
import { createPartTrack } from '../createPartTrack';
import type { TrackGeometry } from '../../../../types';

const ORIGIN = { x: 1000, y: 1000 };
const ROTATIONS = [0, 37, 90, 180, 300];

function closeTo(a: number, b: number, eps = 0.5) {
    return Math.abs(a - b) <= eps;
}

function angleClose(a: number, b: number, eps = 0.5) {
    const d = (((a - b) % 360) + 540) % 360 - 180;
    return Math.abs(d) <= eps;
}

function sameGeometry(a: TrackGeometry, b: TrackGeometry): boolean {
    if (a.type !== b.type) return false;
    if (a.type === 'straight' && b.type === 'straight') {
        return closeTo(a.start.x, b.start.x) && closeTo(a.start.y, b.start.y)
            && closeTo(a.end.x, b.end.x) && closeTo(a.end.y, b.end.y);
    }
    if (a.type === 'arc' && b.type === 'arc') {
        return closeTo(a.center.x, b.center.x) && closeTo(a.center.y, b.center.y)
            && closeTo(a.radius, b.radius)
            && angleClose(a.startAngle, b.startAngle) && angleClose(a.endAngle, b.endAngle);
    }
    return false;
}

// Compound parts are built from these same parts; their own checks are below
const parts = getAllParts().filter(p => p.geometry.type !== 'compound');
const compounds = getAllParts().filter(p => p.geometry.type === 'compound');

/** World position of an edge's start (t = 0) or end (t = 1). */
function edgeEnd(g: TrackGeometry, t: 0 | 1) {
    if (g.type === 'straight') return t === 0 ? g.start : g.end;
    const a = ((t === 0 ? g.startAngle : g.endAngle) * Math.PI) / 180;
    return { x: g.center.x + g.radius * Math.cos(a), y: g.center.y + g.radius * Math.sin(a) };
}

describe('catalog geometry invariants', () => {
    beforeEach(() => useTrackStore.getState().clearLayout());

    describe.each(parts.map(p => [p.id, p] as const))('%s', (_id, part) => {
        it.each(ROTATIONS)('connector model matches created nodes at rotation %i°', (rotation) => {
            const edgeId = useTrackStore.getState().addTrack(part.id, ORIGIN, rotation);
            expect(edgeId).not.toBeNull();
            const nodes = Object.values(useTrackStore.getState().nodes);
            const connectors = getWorldConnectors(part, ORIGIN, rotation);

            for (const c of connectors) {
                const match = nodes.find(n =>
                    closeTo(n.position.x, c.worldPosition.x) && closeTo(n.position.y, c.worldPosition.y));
                expect(match, `no node at connector ${c.localId}`).toBeDefined();
                expect(angleClose(match!.rotation, c.worldFacade),
                    `connector ${c.localId} facade ${c.worldFacade} vs node ${match!.rotation}`).toBe(true);
            }
        });

        it.each(ROTATIONS)('derived world geometry matches created geometry at rotation %i°', (rotation) => {
            useTrackStore.getState().addTrack(part.id, ORIGIN, rotation);
            const { nodes, edges } = useTrackStore.getState();
            for (const edge of Object.values(edges)) {
                const derived = deriveWorldGeometry(edge, nodes);
                expect(derived && sameGeometry(derived, edge.geometry),
                    `edge ${edge.id.slice(0, 6)}: ${JSON.stringify(edge.geometry)} vs ${JSON.stringify(derived)}`).toBe(true);
            }
        });

        it('extends forward: no connector lies behind the primary connector', () => {
            // The primary connector's facade points out of the part, so the rest
            // of the part must lie on the opposite side (or level, e.g. a T branch).
            useTrackStore.getState().addTrack(part.id, ORIGIN, 0);
            const primaryId = getPartConnectors(part).primaryNodeId;
            const a = getWorldConnectors(part, ORIGIN, 0).find(c => c.localId === primaryId)!;
            const inward = { x: -Math.cos(a.worldFacade * Math.PI / 180), y: -Math.sin(a.worldFacade * Math.PI / 180) };
            const ahead = Object.values(useTrackStore.getState().nodes).map(n =>
                (n.position.x - a.worldPosition.x) * inward.x + (n.position.y - a.worldPosition.y) * inward.y);
            for (const d of ahead) expect(d).toBeGreaterThan(-0.5);
            expect(Math.max(...ahead)).toBeGreaterThan(1);
        });
    });
});

describe('arc edges sweep exactly the part angle', () => {
    // Arcs are drawn from min(start, end) through |end - start|. An end angle
    // re-normalized across 0° (345° → 0°) turns a 15° branch into a 345° circle.
    const every5 = Array.from({ length: 72 }, (_, i) => i * 5);
    it.each(getAllParts().map(p => [p.id, p] as const))('%s at every 5° rotation', (_id, part) => {
        for (const rotation of every5) {
            const { edges } = createPartTrack(part, ORIGIN, rotation);
            for (const edge of edges) {
                if (edge.geometry.type !== 'arc' || edge.intrinsicGeometry?.type !== 'arc') continue;
                const sweep = Math.abs(edge.geometry.endAngle - edge.geometry.startAngle);
                expect(sweep, `rotation ${rotation}°: ${edge.geometry.startAngle}→${edge.geometry.endAngle}`)
                    .toBeCloseTo(edge.intrinsicGeometry.sweepAngle, 6);
            }
        }
    });
});

describe('every edge reaches its nodes', () => {
    // Where the track is drawn must be where the graph says it ends, or trains
    // jump. Compound parts fuse sub-part connectors: #4 crossover branches meet
    // 1mm apart on paper (Kato's own geometry; UniJoiner play), hence the
    // looser bound for them.
    it.each(getAllParts().map(p => [p.id, p] as const))('%s', (_id, part) => {
        const tolerance = part.geometry.type === 'compound' ? 1.5 : 0.01;
        for (const rotation of ROTATIONS) {
            const { nodes, edges } = createPartTrack(part, ORIGIN, rotation);
            const byId = new Map(nodes.map(n => [n.id, n]));
            for (const edge of edges) {
                for (const [t, nodeId] of [[0, edge.startNodeId], [1, edge.endNodeId]] as const) {
                    const end = edgeEnd(edge.geometry, t);
                    const node = byId.get(nodeId)!;
                    const gap = Math.hypot(end.x - node.position.x, end.y - node.position.y);
                    expect(gap, `rotation ${rotation}°, edge ${t === 0 ? 'start' : 'end'}`).toBeLessThan(tolerance);
                }
            }
        }
    });
});

describe.each(compounds.map(p => [p.id, p] as const))('compound %s', (_id, part) => {
    it.each(ROTATIONS)('external connectors match created nodes at rotation %i°', (rotation) => {
        const { nodes } = createPartTrack(part, ORIGIN, rotation);
        for (const c of getWorldConnectors(part, ORIGIN, rotation)) {
            const match = nodes.find(n =>
                closeTo(n.position.x, c.worldPosition.x) && closeTo(n.position.y, c.worldPosition.y));
            expect(match, `no node at connector ${c.localId}`).toBeDefined();
            expect(angleClose(match!.rotation, c.worldFacade), `connector ${c.localId} facade`).toBe(true);
        }
    });
});
