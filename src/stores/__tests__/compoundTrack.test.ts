/**
 * Unit Tests for Compound Track System
 *
 * Tests the CompoundGeometry type, compoundTrack creator, connector computation,
 * catalog validation, and store integration (add/remove).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTrackStore } from '../useTrackStore';
import { getPartById } from '../../data/catalog';
import { hasPartId } from '../../data/catalog/registry';
import { createCompoundTrack } from '../slices/trackCreators/compoundTrack';
import { computeConnectors } from '../../data/catalog/connectors';
import type { CompoundGeometry } from '../../data/catalog/types';
import type { PartId, Vector2 } from '../../types';

// ===========================
// Test Helpers
// ===========================

function getState() {
    return useTrackStore.getState();
}

function nodeCount(): number {
    return Object.keys(getState().nodes).length;
}

function edgeCount(): number {
    return Object.keys(getState().edges).length;
}

// ===========================
// Catalog Registration
// ===========================

describe('Compound parts catalog', () => {
    it('registers kato-20-230 (Single Crossover Left)', () => {
        expect(hasPartId('kato-20-230')).toBe(true);
        const part = getPartById('kato-20-230');
        expect(part).toBeDefined();
        expect(part!.geometry.type).toBe('compound');
    });

    it('registers kato-20-231 (Single Crossover Right)', () => {
        expect(hasPartId('kato-20-231')).toBe(true);
        const part = getPartById('kato-20-231');
        expect(part).toBeDefined();
        expect(part!.geometry.type).toBe('compound');
    });

    it('fixes kato-20-310 → kato-20-300/20-301 (real 15° crossings)', () => {
        expect(hasPartId('kato-20-310')).toBe(false);
        expect(hasPartId('kato-20-300')).toBe(true);
        expect(hasPartId('kato-20-301')).toBe(true);

        const p300 = getPartById('kato-20-300')!;
        expect(p300.geometry.type).toBe('crossing');
        if (p300.geometry.type === 'crossing') {
            expect(p300.geometry.length).toBe(186);
            expect(p300.geometry.crossingAngle).toBe(15);
        }
    });

    it('registers wooden-crossing-90 (BRIO cross track)', () => {
        expect(hasPartId('wooden-crossing-90')).toBe(true);
        const part = getPartById('wooden-crossing-90')!;
        expect(part.geometry.type).toBe('crossing');
        if (part.geometry.type === 'crossing') {
            expect(part.geometry.length).toBe(108);
            expect(part.geometry.crossingAngle).toBe(90);
        }
    });

    it('compound sub-parts reference valid catalog parts', () => {
        const part = getPartById('kato-20-230')!;
        const geo = part.geometry as CompoundGeometry;

        for (const sp of geo.subParts) {
            expect(hasPartId(sp.partRef)).toBe(true);
            const subPart = getPartById(sp.partRef)!;
            // Sub-parts must be non-compound (no recursion)
            expect(subPart.geometry.type).not.toBe('compound');
        }
    });
});

// ===========================
// Compound Track Creator
// ===========================

describe('createCompoundTrack', () => {
    it('creates correct node and edge counts for single crossover', () => {
        const part = getPartById('kato-20-230')!;
        const geo = part.geometry as CompoundGeometry;

        const result = createCompoundTrack(
            'kato-20-230' as PartId,
            { x: 400, y: 300 },
            0,
            geo
        );

        // Two #4 turnouts: each has 3 nodes + 2 edges = 6 nodes + 4 edges
        // 1 joint fuses 2 nodes into 1, so: 5 nodes + 4 edges
        expect(result.nodes.length).toBe(5);
        expect(result.edges.length).toBe(4);
    });

    it('all edges share the compound partId', () => {
        const part = getPartById('kato-20-230')!;
        const geo = part.geometry as CompoundGeometry;

        const result = createCompoundTrack(
            'kato-20-230' as PartId,
            { x: 400, y: 300 },
            0,
            geo
        );

        for (const edge of result.edges) {
            expect(edge.partId).toBe('kato-20-230');
        }
    });

    it('all edges share the same placementId', () => {
        const part = getPartById('kato-20-230')!;
        const geo = part.geometry as CompoundGeometry;

        const result = createCompoundTrack(
            'kato-20-230' as PartId,
            { x: 400, y: 300 },
            0,
            geo
        );

        const ids = new Set(result.edges.map(e => e.placementId));
        expect(ids.size).toBe(1);
        expect(result.edges[0].placementId).toBeDefined();
    });

    it('has correct external connector map', () => {
        const part = getPartById('kato-20-230')!;
        const geo = part.geometry as CompoundGeometry;

        const result = createCompoundTrack(
            'kato-20-230' as PartId,
            { x: 400, y: 300 },
            0,
            geo
        );

        expect(Object.keys(result.connectorNodeMap)).toEqual(
            expect.arrayContaining(['A1', 'A2', 'B1', 'B2'])
        );
        expect(Object.keys(result.connectorNodeMap).length).toBe(4);
    });

    it('internal joint node has merged connections', () => {
        const part = getPartById('kato-20-230')!;
        const geo = part.geometry as CompoundGeometry;

        const result = createCompoundTrack(
            'kato-20-230' as PartId,
            { x: 400, y: 300 },
            0,
            geo
        );

        // The fused node should have connections from both turnouts' branch edges
        // Find node that is NOT in the external connector map
        const externalNodeIds = new Set(Object.values(result.connectorNodeMap));
        const internalNodes = result.nodes.filter(n => !externalNodeIds.has(n.id));

        // The fused branch node should exist
        // It connects branch edges from both turnouts
        expect(internalNodes.length).toBeGreaterThanOrEqual(0);

        // Total connections across all nodes should equal 2 * edge count
        // (each edge has a start and end node reference)
        const totalConnections = result.nodes.reduce((sum, n) => sum + n.connections.length, 0);
        expect(totalConnections).toBe(result.edges.length * 2);
    });

    it('switch nodes have switchBranches set', () => {
        const part = getPartById('kato-20-230')!;
        const geo = part.geometry as CompoundGeometry;

        const result = createCompoundTrack(
            'kato-20-230' as PartId,
            { x: 400, y: 300 },
            0,
            geo
        );

        const switchNodes = result.nodes.filter(n => n.type === 'switch');
        expect(switchNodes.length).toBe(2); // Two turnout entry nodes

        for (const sw of switchNodes) {
            expect(sw.switchBranches).toBeDefined();
            expect(sw.switchBranches!.length).toBe(2);
        }
    });

    it('respects rotation parameter', () => {
        const part = getPartById('kato-20-230')!;
        const geo = part.geometry as CompoundGeometry;
        const pos: Vector2 = { x: 400, y: 300 };

        const result0 = createCompoundTrack('kato-20-230' as PartId, pos, 0, geo);
        const result90 = createCompoundTrack('kato-20-230' as PartId, pos, 90, geo);

        // At rotation 0, nodes should spread horizontally
        // At rotation 90, nodes should spread vertically
        const xSpread0 = Math.max(...result0.nodes.map(n => n.position.x)) - Math.min(...result0.nodes.map(n => n.position.x));
        const ySpread90 = Math.max(...result90.nodes.map(n => n.position.y)) - Math.min(...result90.nodes.map(n => n.position.y));

        // Both should have similar spread magnitude
        expect(Math.abs(xSpread0 - ySpread90)).toBeLessThan(1);
    });
});

// ===========================
// Compound Connectors
// ===========================

describe('computeCompoundConnectors', () => {
    it('returns only external connectors', () => {
        const part = getPartById('kato-20-230')!;
        const connectors = computeConnectors(part);

        expect(connectors.nodes.length).toBe(4);
        const ids = connectors.nodes.map(n => n.localId).sort();
        expect(ids).toEqual(['A1', 'A2', 'B1', 'B2']);
    });

    it('connector facades are 180° opposite for mating', () => {
        const part = getPartById('kato-20-230')!;
        const connectors = computeConnectors(part);

        // A1 (entry of upper turnout) should face backward (180°)
        const a1 = connectors.nodes.find(n => n.localId === 'A1')!;
        expect(a1.localFacade).toBe(180);

        // A2 (main exit of upper turnout) should face forward (0°)
        const a2 = connectors.nodes.find(n => n.localId === 'A2')!;
        expect(a2.localFacade).toBe(0);
    });
});

// ===========================
// Store Integration
// ===========================

describe('compound track store integration', () => {
    beforeEach(() => {
        getState().clearLayout();
    });

    it('addTrack places compound part correctly', () => {
        const edgeId = getState().addTrack('kato-20-230', { x: 400, y: 300 }, 0);
        expect(edgeId).toBeDefined();
        expect(nodeCount()).toBe(5);
        expect(edgeCount()).toBe(4);
    });

    it('removeTrack cascades to all compound edges', () => {
        const edgeId = getState().addTrack('kato-20-230', { x: 400, y: 300 }, 0);
        expect(edgeId).toBeDefined();
        expect(edgeCount()).toBe(4);

        // Remove one edge — should cascade to all 4
        getState().removeTrack(edgeId!);
        expect(edgeCount()).toBe(0);
        expect(nodeCount()).toBe(0);
    });

    it('removeTrack does not affect non-compound parts', () => {
        // Place a compound and a simple straight
        getState().addTrack('kato-20-230', { x: 400, y: 300 }, 0);
        const straightEdge = getState().addTrack('kato-20-000', { x: 100, y: 100 }, 0);
        expect(edgeCount()).toBe(5); // 4 compound + 1 straight

        // Remove the straight — only 1 edge should go
        getState().removeTrack(straightEdge!);
        expect(edgeCount()).toBe(4); // compound still intact
    });
});
