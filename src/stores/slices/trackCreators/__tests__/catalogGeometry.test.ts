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

const parts = getAllParts().filter(p => p.geometry.type !== 'compound');

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
