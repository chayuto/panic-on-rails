/**
 * One entry point for building any catalog part's nodes and edges.
 *
 * Pure: returns the graph fragment for a part placed at `position` with
 * `rotation`, without touching stores or spatial indices. `addTrack()` uses
 * it to place parts; layout-plan previews use it to draw them.
 *
 * @module trackCreators/createPartTrack
 */

import { v4 as uuidv4 } from 'uuid';
import type { EdgeId, NodeId, TrackEdge, TrackNode, Vector2, PartId } from '../../../types';
import type { PartDefinition } from '../../../data/catalog/types';
import { createStraightTrack, createCurveTrack } from './standardTrack';
import { createSwitchTrack } from './switchTrack';
import { createCrossingTrack } from './crossingTrack';
import { createCompoundTrack } from './compoundTrack';
import { createTopologyTrack } from './topologyTrack';

export interface PartTrackResult {
    nodes: TrackNode[];
    edges: TrackEdge[];
    primaryEdgeId: EdgeId;
    connectorNodeMap: Record<string, NodeId>;
}

/**
 * Build a part's nodes and edges. Every edge of the piece shares one
 * `placementId`, so the piece is selected, removed and counted as a whole
 * (a turnout is one piece, not two edges).
 */
export function createPartTrack(part: PartDefinition, position: Vector2, rotation: number): PartTrackResult {
    const result = buildPart(part, position, rotation);
    const placementId = result.edges[0]?.placementId ?? uuidv4();
    return { ...result, edges: result.edges.map(e => (e.placementId ? e : { ...e, placementId })) };
}

function buildPart(part: PartDefinition, position: Vector2, rotation: number): PartTrackResult {
    const partId = part.id as PartId;
    const geometry = part.geometry;
    switch (geometry.type) {
        case 'straight':
            return createStraightTrack(partId, position, rotation, geometry);
        case 'curve':
            return createCurveTrack(partId, position, rotation, geometry);
        case 'switch':
            return createSwitchTrack(partId, position, rotation, geometry);
        case 'crossing':
            return createCrossingTrack(partId, position, rotation, geometry);
        case 'compound':
            return createCompoundTrack(partId, position, rotation, geometry);
        case 'topology':
            return createTopologyTrack(partId, position, rotation, geometry);
    }
}
