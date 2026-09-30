/**
 * Elevation: track raised above the baseboard on piers or viaducts. A node
 * carries its height; a piece between two heights is a grade, rising
 * evenly along its length. Pure helpers over the track graph.
 */

import type { NodeId, TrackEdge, TrackNode } from '../types';

/** Ends this close in height (mm) are level with each other: they can join. */
export const HEIGHT_TOLERANCE = 0.5;

/**
 * Track this far apart in height (mm, N scale; a bigger scale grows it)
 * passes over or under without its trains touching: a car's height, rails
 * to roof.
 */
export const VERTICAL_CLEARANCE = 26;

/** How high the track stands at a node (mm): 0 on the baseboard. */
export function heightOf(node: Pick<TrackNode, 'height'> | undefined): number {
    return node?.height ?? 0;
}

/** Two ends level with each other, so they can join. */
export function sameHeight(a: Pick<TrackNode, 'height'>, b: Pick<TrackNode, 'height'>): boolean {
    return Math.abs(heightOf(a) - heightOf(b)) <= HEIGHT_TOLERANCE;
}

/** How high the track stands `distance` mm along an edge from its start node. */
export function heightAlong(edge: TrackEdge, distance: number, nodes: Record<NodeId, TrackNode>): number {
    const start = heightOf(nodes[edge.startNodeId]);
    const end = heightOf(nodes[edge.endNodeId]);
    if (start === end || edge.length <= 0) return start;
    const t = Math.max(0, Math.min(1, distance / edge.length));
    return start + (end - start) * t;
}

/** An edge's grade from its start node to its end: rise over run (0.04 is 4%). */
export function gradeOf(edge: TrackEdge, nodes: Record<NodeId, TrackNode>): number {
    if (edge.length <= 0) return 0;
    return (heightOf(nodes[edge.endNodeId]) - heightOf(nodes[edge.startNodeId])) / edge.length;
}

