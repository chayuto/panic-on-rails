/**
 * Topology parts: routes walked from their connectors, points where two
 * routes meet, and clear errors when routes that should meet don't.
 */

import { describe, it, expect } from 'vitest';
import { advance, resolveTopology, TopologyError } from '../topology';
import type { TopologyGeometry } from '../types';
import { createTopologyTrack } from '../../../stores/slices/trackCreators/topologyTrack';
import type { PartId } from '../../../types';
import { getPartById, partCategory } from '../index';

/** A #6-style turnout: straight 186, or R718 15° to the right. */
const turnout: TopologyGeometry = {
    type: 'topology',
    connectors: { entry: { x: 0, y: 0, heading: 0 } },
    routes: [
        { from: 'entry', to: 'main', path: [{ straight: 186 }] },
        { from: 'entry', to: 'branch', path: [{ arc: 718, angle: 15, turn: 'right' }] },
    ],
};

describe('advance', () => {
    it('walks a straight along the heading and an arc around its centre', () => {
        expect(advance({ x: 0, y: 0, heading: 90 }, { straight: 10 })).toEqual({ x: expect.closeTo(0, 9), y: 10, heading: 90 });
        const right = advance({ x: 0, y: 0, heading: 0 }, { arc: 100, angle: 90, turn: 'right' });
        // A right turn on screen (+Y down) ends below and ahead, heading south
        expect(right.x).toBeCloseTo(100, 9);
        expect(right.y).toBeCloseTo(100, 9);
        expect(right.heading).toBe(90);
        const left = advance({ x: 0, y: 0, heading: 0 }, { arc: 100, angle: 90, turn: 'left' });
        expect(left.y).toBeCloseTo(-100, 9);
        expect(left.heading).toBe(-90);
    });
});

describe('resolveTopology', () => {
    it('makes a connector at each route end, facing out of the part', () => {
        const t = resolveTopology(turnout);
        const byId = Object.fromEntries(t.connectors.map(c => [c.id, c]));
        expect(t.primary).toBe('entry');
        expect(byId.entry.facade).toBe(180);
        expect(byId.main).toMatchObject({ x: 186, y: 0, facade: 0 });
        expect(byId.branch.x).toBeCloseTo(718 * Math.sin(Math.PI / 12), 6);
        expect(byId.branch.y).toBeCloseTo(718 * (1 - Math.cos(Math.PI / 12)), 6);
        expect(byId.branch.facade).toBeCloseTo(15, 9);
        // Both routes leave the entry: that's the points
        expect(byId.entry.routes).toEqual([0, 1]);
    });

    it('rejects routes that should meet but miss, with the gap', () => {
        const bad: TopologyGeometry = {
            type: 'topology',
            connectors: { a: { x: 0, y: 0, heading: 0 }, b: { x: 0, y: 30, heading: 0 } },
            routes: [
                { from: 'a', to: 'end', path: [{ straight: 100 }] },
                { from: 'b', to: 'end', path: [{ straight: 100 }] },
            ],
        };
        expect(() => resolveTopology(bad)).toThrow(TopologyError);
        expect(() => resolveTopology(bad)).toThrow(/route 1 ends 30.00 mm from connector "end"/);
    });

    it('rejects a route arriving at a connector facing the wrong way', () => {
        const bad: TopologyGeometry = {
            type: 'topology',
            // b faces south (270° out of the part), but the route runs into it heading east
            connectors: { a: { x: 0, y: 0, heading: 0 }, b: { x: 100, y: 0, heading: 90 } },
            routes: [{ from: 'a', to: 'b', path: [{ straight: 100 }] }],
        };
        expect(() => resolveTopology(bad)).toThrow(/arrives at "b" heading 0.00°, but it faces 270.00°/);
    });

    it('rejects unknown connectors and three routes at one connector', () => {
        expect(() => resolveTopology({ ...turnout, routes: [{ from: 'nope', to: 'x', path: [{ straight: 1 }] }] }))
            .toThrow(/unknown connector "nope"/);
        expect(() => resolveTopology({
            ...turnout,
            routes: [...turnout.routes, { from: 'entry', to: 'third', path: [{ arc: 718, angle: 15, turn: 'left' }] }],
        })).toThrow(/"entry" has 3 routes/);
    });

    it('links only connectors that are points, each once', () => {
        expect(() => resolveTopology({ ...turnout, points: [['entry', 'main']] }))
            .toThrow(/linked points name "main", which is not a set of points/);
        expect(() => resolveTopology({ ...turnout, points: [['entry', 'entry']] }))
            .toThrow(/points "entry" are linked twice/);
    });
});

describe('createTopologyTrack', () => {
    it('builds a turnout: points at the entry, one edge per step', () => {
        const { nodes, edges, connectorNodeMap } = createTopologyTrack('t' as PartId, { x: 100, y: 100 }, 90, turnout);
        expect(edges).toHaveLength(2);
        const entry = nodes.find(n => n.id === connectorNodeMap.entry)!;
        expect(entry.type).toBe('switch');
        expect(entry.switchState).toBe(0);
        // State 0 is the first route listed: straight through
        expect(edges.find(e => e.id === entry.switchBranches![0])!.geometry.type).toBe('straight');
        expect(edges.find(e => e.id === entry.switchBranches![1])!.geometry.type).toBe('arc');
        // Rotated 90°: the straight route heads south
        expect(nodes.find(n => n.id === connectorNodeMap.main)!.position).toEqual({ x: expect.closeTo(100, 6), y: expect.closeTo(286, 6) });
    });

    it('gives linked points one shared group', () => {
        const { nodes } = createTopologyTrack('x' as PartId, { x: 0, y: 0 }, 0, {
            type: 'topology',
            connectors: { a: { x: 0, y: 0, heading: 0 }, b: { x: 0, y: 33, heading: 0 } },
            routes: [
                { from: 'a', to: 'c', path: [{ straight: 100 }] },
                { from: 'a', to: 'd', path: [{ arc: 718, angle: 15, turn: 'right' }] },
                { from: 'b', to: 'e', path: [{ straight: 100 }] },
                { from: 'b', to: 'f', path: [{ arc: 718, angle: 15, turn: 'left' }] },
            ],
            points: [['a', 'b']],
        });
        const groups = nodes.filter(n => n.type === 'switch').map(n => n.switchGroup);
        expect(groups).toHaveLength(2);
        expect(groups[0]).toBeTruthy();
        expect(groups[0]).toBe(groups[1]);
    });

    it('joins the steps of one route with a node in between', () => {
        const s: TopologyGeometry = {
            type: 'topology',
            connectors: { a: { x: 0, y: 0, heading: 0 } },
            routes: [{ from: 'a', to: 'b', path: [{ straight: 50 }, { arc: 200, angle: 30, turn: 'left' }, { straight: 50 }] }],
        };
        const { nodes, edges } = createTopologyTrack('s' as PartId, { x: 0, y: 0 }, 0, s);
        expect(edges).toHaveLength(3);
        expect(nodes).toHaveLength(4);
        expect(nodes.filter(n => n.type === 'junction').map(n => n.connections.length)).toEqual([2, 2]);
    });
});

describe('partCategory for topology parts', () => {
    it('routes that split make a turnout; two separate tracks make a crossing', () => {
        const base = getPartById('kato-20-210')!;
        expect(partCategory(base)).toBe('crossing');
        expect(partCategory({ ...base, geometry: turnout })).toBe('turnout');
    });
});
