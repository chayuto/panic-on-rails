/**
 * Hand-built graph fixtures for simulation unit tests.
 *
 * Straight edges along the X axis, joined end to end. Only the fields the
 * simulation reads are meaningful; geometry is a plain straight segment.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Train, TrackEdge, TrackNode, EdgeId, NodeId } from '../../types';
import type { SimWorld } from '../step';
import type { TrackTemplate } from '../../data/templates/types';

/** Load a shipped template recipe from public/templates. */
export function loadTemplateJson(id: string): TrackTemplate {
    const path = resolve(__dirname, '../../../public/templates', `${id}.json`);
    return JSON.parse(readFileSync(path, 'utf8')) as TrackTemplate;
}

export function straightEdge(id: string, start: string, end: string, x0: number, length: number): TrackEdge {
    return {
        id, partId: 'test-straight', startNodeId: start, endNodeId: end, length,
        geometry: { type: 'straight', start: { x: x0, y: 0 }, end: { x: x0 + length, y: 0 } },
    };
}

export function node(id: string, x: number, connections: EdgeId[], extra: Partial<TrackNode> = {}): TrackNode {
    const type = connections.length > 1 ? 'junction' : 'endpoint';
    return { id, position: { x, y: 0 }, rotation: 0, connections, type, ...extra };
}

/**
 * A line of `count` straight edges of `length` each:
 *   n0 —e0— n1 —e1— n2 ... n{count}
 */
export function lineGraph(count: number, length = 100): { edges: Record<EdgeId, TrackEdge>; nodes: Record<NodeId, TrackNode> } {
    const edges: Record<EdgeId, TrackEdge> = {};
    const nodes: Record<NodeId, TrackNode> = {};
    for (let i = 0; i < count; i++) {
        edges[`e${i}`] = straightEdge(`e${i}`, `n${i}`, `n${i + 1}`, i * length, length);
    }
    for (let i = 0; i <= count; i++) {
        const conns = [i > 0 ? `e${i - 1}` : null, i < count ? `e${i}` : null].filter((c): c is string => c !== null);
        nodes[`n${i}`] = node(`n${i}`, i * length, conns);
    }
    return { edges, nodes };
}

export function train(id: string, edgeId: EdgeId, distance: number, direction: 1 | -1 = 1, speed = 100): Train {
    return { id, currentEdgeId: edgeId, distanceAlongEdge: distance, direction, speed, color: '#f00', carriageCount: 1, carriageSpacing: 30 };
}

export function world(partial: Partial<SimWorld>): SimWorld {
    return { trains: {}, edges: {}, nodes: {}, sensors: {}, signals: {}, wires: {}, stations: {}, crashedParts: [], ...partial };
}
