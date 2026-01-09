/**
 * Graph Data Structures
 */

import type { NodeId, EdgeId, PartId, Vector2 } from './common';
import type { TrackGeometry, IntrinsicGeometry } from './geometry';

/** A connection point between track edges */
export interface TrackNode {
    id: NodeId;
    position: Vector2;
    rotation: number; // degrees, direction the connector faces
    connections: EdgeId[];
    type: 'endpoint' | 'junction' | 'switch';
    // Switch-specific fields
    switchState?: 0 | 1;           // 0 = main path, 1 = branch path
    switchBranches?: [EdgeId, EdgeId]; // [mainEdgeId, branchEdgeId] - exit edges
}

/** A rail segment connecting two nodes */
export interface TrackEdge {
    id: EdgeId;
    partId: PartId;
    startNodeId: NodeId;
    endNodeId: NodeId;
    geometry: TrackGeometry;
    length: number; // pre-calculated for performance
    // V2: Intrinsic geometry (does not depend on world position)
    // Used to derive world geometry from node positions
    intrinsicGeometry?: IntrinsicGeometry;
}
