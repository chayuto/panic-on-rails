import { describe, it, expect, beforeEach } from 'vitest';
import { infillBetween, KATO_LOOK } from '../trackPainter';
import { paintedEdges, type PlacedEdge } from '../paintedEdges';
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

describe('paintedEdges', () => {
    beforeEach(() => resetWorld());

    /** A boxed set's layout, laid and painted with nothing selected. */
    function paintSet(setId: string) {
        loadSetPlan(setId);
        const { edges, nodes } = useTrackStore.getState();
        const placed: PlacedEdge[] = Object.values(edges).map(edge => ({
            edge,
            geometry: getEdgeWorldGeometry(edge, nodes)!,
            part: getPartById(edge.partId),
        }));
        const doublePieces = new Set(placed.filter(p => p.part && isDoubleTrack(p.part)).map(p => p.edge.placementId));
        return { placed, painted: paintedEdges(placed, null, new Set()), doublePieces: doublePieces.size };
    }

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

    it('lays no infill beside single track', () => {
        expect(paintSet('kato-20-852').painted.some(p => p.infill)).toBe(false);
    });
});
