import { describe, it, expect, beforeEach } from 'vitest';
import { infillBetween, KATO_LOOK, KATO_SLAB_LOOK } from '../trackPainter';
import { middleHeight, paintedEdges, piersUnder, type PlacedEdge } from '../paintedEdges';
import { resetWorld, loadSetPlan } from '../../../../simulation/harness';
import { useTrackStore } from '../../../../stores/useTrackStore';
import { getEdgeWorldGeometry } from '../../../../hooks/useEdgeGeometry';
import { getPartById } from '../../../../data/catalog';
import { isDoubleTrack } from '../../../../data/catalog/helpers';
import type { TrackGeometry } from '../../../../types';

const straight = (x1: number, y1: number, x2: number, y2: number): TrackGeometry =>
    ({ type: 'straight', start: { x: x1, y: y1 }, end: { x: x2, y: y2 } });
const arc = (radius: number, startAngle: number, endAngle: number, cx = 0, cy = 0): TrackGeometry =>
    ({ type: 'arc', center: { x: cx, y: cy }, radius, startAngle, endAngle });

describe('infillBetween', () => {
    it('runs down the middle of two parallel straights, as wide as they are apart', () => {
        expect(infillBetween(straight(0, 0, 248, 0), straight(0, 33, 248, 33))).toEqual({
            geometry: straight(0, 16.5, 248, 16.5),
            width: 33,
        });
    });

    it('follows two concentric arcs at their mean radius', () => {
        expect(infillBetween(arc(414, 10, 55), arc(381, 10, 55))).toEqual({ geometry: arc(397.5, 10, 55), width: 33 });
    });

    it('matches arcs whose start angles differ by a turn', () => {
        expect(infillBetween(arc(414, 359.9999, 44.9999 + 360), arc(381, 0.0001, 45.0001))).not.toBeNull();
    });

    it('lays nothing between tracks that don\'t run side by side', () => {
        expect(infillBetween(straight(0, 0, 248, 0), straight(0, 33, 248, 60))).toBeNull();
        expect(infillBetween(arc(414, 10, 55), arc(381, 10, 55, 5, 0))).toBeNull();
        expect(infillBetween(arc(414, 10, 55), arc(381, 10, 40))).toBeNull();
        expect(infillBetween(straight(0, 0, 248, 0), arc(381, 10, 55))).toBeNull();
    });
});

/** A boxed set's layout, laid and painted with nothing selected. */
function paintSet(setId: string) {
    loadSetPlan(setId);
    const { edges, nodes } = useTrackStore.getState();
    const placed: PlacedEdge[] = Object.values(edges).map(edge => ({
        edge,
        geometry: getEdgeWorldGeometry(edge, nodes)!,
        part: getPartById(edge.partId),
        height: middleHeight(edge, nodes),
    }));
    const doublePieces = new Set(placed.filter(p => p.part && isDoubleTrack(p.part)).map(p => p.edge.placementId));
    return { placed, painted: paintedEdges(placed, null, new Set()), doublePieces: doublePieces.size };
}

describe('paintedEdges', () => {
    beforeEach(() => resetWorld());


    it('lays one ballast infill down each piece of Kato double track (V11)', () => {
        const { placed, painted, doublePieces } = paintSet('kato-20-870');
        const infills = painted.filter(p => p.infill);
        expect(doublePieces).toBeGreaterThan(20);
        expect(infills).toHaveLength(doublePieces);
        expect(painted).toHaveLength(placed.length + infills.length);
        for (const infill of infills) {
            expect(infill.width).toBeCloseTo(33, 6);
            expect(infill.look).toBe(KATO_LOOK);
        }
    });

    it('paints the slab track set (V17) as slab track, infill and all', () => {
        const { painted, doublePieces } = paintSet('kato-20-877');
        expect(painted.filter(p => p.infill)).toHaveLength(doublePieces);
        expect(painted.every(p => p.look === KATO_SLAB_LOOK)).toBe(true);
    });

    it('lays no infill beside single track', () => {
        expect(paintSet('kato-20-852').painted.some(p => p.infill)).toBe(false);
    });
});

describe('raised track', () => {
    beforeEach(() => resetWorld());

    it('paints at its height, with a pier under every raised joint', () => {
        // Two straights end to end, the second raised 40 mm at its far end: a grade
        const state = useTrackStore.getState();
        const flat = state.addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const ramp = state.addTrack('kato-20-000', { x: 248, y: 0 }, 0)!;
        const { edges } = useTrackStore.getState();
        state.setNodeHeights({ [edges[ramp].endNodeId]: 40 });
        const { nodes } = useTrackStore.getState();
        const placed: PlacedEdge[] = [flat, ramp].map(id => ({
            edge: edges[id], geometry: getEdgeWorldGeometry(edges[id], nodes)!, part: getPartById(edges[id].partId), height: middleHeight(edges[id], nodes),
        }));
        const painted = paintedEdges(placed, null, new Set());
        expect(painted.map(p => p.height)).toEqual([undefined, 20]);
        expect(piersUnder(placed, nodes)).toEqual([{ x: 496, y: 0, height: 40 }]);
    });
});

describe('the V2 viaduct set', () => {
    beforeEach(() => resetWorld());

    it('climbs Kato\'s standard heights, never steeper than the first viaduct piece\'s 6%', () => {
        loadSetPlan('kato-20-861');
        const { edges, nodes } = useTrackStore.getState();
        // The ground track on its spacer and stairs, then piers No.1 to No.5: the track 10 mm above each pier
        const heights = [...new Set(Object.values(nodes).map(n => n.height ?? 0))].sort((a, b) => a - b);
        expect(heights).toEqual([0, 5, 10, 25, 35, 45, 55, 60]);
        const grades = Object.values(edges).map(e => Math.abs((nodes[e.endNodeId].height ?? 0) - (nodes[e.startNodeId].height ?? 0)) / e.length);
        expect(Math.max(...grades)).toBeCloseTo(15 / 247.4, 2);
        expect(Math.max(...grades)).toBeLessThan(0.065);
    });

    it('paints the viaduct as a concrete deck and the truss in its red', () => {
        const { painted } = paintSet('kato-20-861');
        const decks = painted.filter(p => p.deck).map(p => p.deck!);
        expect(decks.filter(d => d.kind === 'viaduct')).toHaveLength(14);
        expect(decks.filter(d => d.kind === 'truss')).toEqual([{ kind: 'truss', width: 33, color: '#c8372d' }]);
        // The ground track at the foot of the climbs is plain Unitrack
        expect(painted.filter(p => !p.deck)).toHaveLength(4);
    });
});

