/**
 * Topology Track Creator
 *
 * Builds any topology part (curved turnout, double slip, scissors
 * crossover...) from its routes: one node per connector, one node where
 * two steps of a route join, one edge per step. A connector where two
 * routes meet becomes a set of points.
 *
 * @module trackCreators/topologyTrack
 */

import { v4 as uuidv4 } from 'uuid';
import type { NodeId, EdgeId, TrackNode, TrackEdge, Vector2, PartId, TrackGeometry, IntrinsicGeometry } from '../../../types';
import type { TopologyGeometry } from '../../../data/catalog/types';
import { resolveTopology, stepLength, type TopologySegment } from '../../../data/catalog/topology';
import { localToWorld, normalizeAngle } from '../../../utils/geometry';
import type { PartTrackResult } from './createPartTrack';

const rad = (deg: number) => (deg * Math.PI) / 180;

/** World geometry of one step, placed at `position` turned by `rotation`. */
function segmentGeometry(segment: TopologySegment, position: Vector2, rotation: number): {
    geometry: TrackGeometry;
    intrinsic: IntrinsicGeometry;
} {
    const start = localToWorld(segment.start, position, rotation);
    const track = segment.track;
    if ('straight' in track) {
        return {
            geometry: { type: 'straight', start, end: localToWorld(segment.end, position, rotation) },
            intrinsic: { type: 'straight', length: track.straight },
        };
    }
    const side = track.turn === 'right' ? 1 : -1;
    const heading = segment.start.heading + rotation;
    const toCentre = rad(heading + side * 90);
    const center = {
        x: start.x + Math.cos(toCentre) * track.arc,
        y: start.y + Math.sin(toCentre) * track.arc,
    };
    const startAngle = normalizeAngle(heading - side * 90);
    return {
        // Right turns sweep to increasing angles; left turns to decreasing
        geometry: { type: 'arc', center, radius: track.arc, startAngle, endAngle: startAngle + side * track.angle },
        // 'ccw' here means increasing angles, i.e. clockwise on screen: a right turn
        intrinsic: { type: 'arc', radius: track.arc, sweepAngle: track.angle, direction: side === 1 ? 'ccw' : 'cw' },
    };
}

export function createTopologyTrack(
    partId: PartId,
    position: Vector2,
    rotation: number,
    geometry: TopologyGeometry
): PartTrackResult {
    const topology = resolveTopology(geometry);
    const nodes = new Map<string, TrackNode>();
    const connectorNodeMap: Record<string, NodeId> = {};

    for (const c of topology.connectors) {
        const node: TrackNode = {
            id: uuidv4() as NodeId,
            position: localToWorld(c, position, rotation),
            rotation: normalizeAngle(c.facade + rotation),
            connections: [],
            type: 'endpoint',
        };
        nodes.set(`c:${c.id}`, node);
        connectorNodeMap[c.id] = node.id;
    }

    const edges: TrackEdge[] = [];
    /** First and last edge of each route, for the points at its ends */
    const routeEnds = new Map<number, { first: EdgeId; last: EdgeId }>();

    for (const segment of topology.segments) {
        const fromKey = segment.fromConnector !== undefined ? `c:${segment.fromConnector}` : `p:${segment.route}.${segment.step}`;
        const toKey = segment.toConnector !== undefined ? `c:${segment.toConnector}` : `p:${segment.route}.${segment.step + 1}`;
        for (const [key, pose] of [[fromKey, segment.start], [toKey, segment.end]] as const) {
            if (!nodes.has(key)) {
                // A point inside a route where two steps of track join
                nodes.set(key, {
                    id: uuidv4() as NodeId,
                    position: localToWorld(pose, position, rotation),
                    rotation: normalizeAngle(pose.heading + rotation),
                    connections: [],
                    type: 'junction',
                });
            }
        }
        const from = nodes.get(fromKey)!;
        const to = nodes.get(toKey)!;
        const { geometry: world, intrinsic } = segmentGeometry(segment, position, rotation);
        const edge: TrackEdge = {
            id: uuidv4() as EdgeId,
            partId,
            startNodeId: from.id,
            endNodeId: to.id,
            geometry: world,
            length: stepLength(segment.track),
            intrinsicGeometry: intrinsic,
        };
        edges.push(edge);
        from.connections.push(edge.id);
        to.connections.push(edge.id);
        const ends = routeEnds.get(segment.route);
        routeEnds.set(segment.route, { first: ends?.first ?? edge.id, last: edge.id });
    }

    // Where two routes meet at a connector: points. The first route listed is
    // the normal position (state 0).
    for (const c of topology.connectors) {
        if (c.routes.length !== 2) continue;
        const node = nodes.get(`c:${c.id}`)!;
        const branch = (route: number) => {
            const ends = routeEnds.get(route)!;
            return geometry.routes[route].from === c.id ? ends.first : ends.last;
        };
        node.type = 'switch';
        node.switchState = 0;
        node.switchBranches = [branch(c.routes[0]), branch(c.routes[1])];
    }

    // Points worked by one control
    for (const group of geometry.points ?? []) {
        const switchGroup = uuidv4();
        for (const id of group) nodes.get(`c:${id}`)!.switchGroup = switchGroup;
    }

    return {
        nodes: [...nodes.values()],
        edges,
        primaryEdgeId: edges[0]?.id ?? ('' as EdgeId),
        connectorNodeMap,
    };
}
