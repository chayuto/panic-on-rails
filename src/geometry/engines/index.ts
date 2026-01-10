import type { GeometryEngine } from '../types';
import type { TrackEdge, TrackNode, NodeId } from '../../types';
import { StraightEngine } from './StraightEngine';
import { ArcEngine } from './ArcEngine';
import { deriveWorldGeometry } from '../../utils/geometry';

export * from './StraightEngine';
export * from './ArcEngine';

/**
 * Create a GeometryEngine for a given track edge.
 * 
 * @param edge - The track edge to create an engine for
 * @param nodes - Record of all nodes (required to derive world geometry from intrinsic)
 * @returns A concrete implementation of GeometryEngine (Straight or Arc)
 * 
 * @throws Error if nodes are missing or geometry type is unknown
 */
export function createGeometryEngine(edge: TrackEdge, nodes: Record<NodeId, TrackNode>): GeometryEngine {
    // 1. Try to get cached/derived world geometry
    const geometry = deriveWorldGeometry(edge, nodes);

    if (!geometry) {
        // This usually happens if nodes are missing
        throw new Error(`[createGeometryEngine] Failed to derive geometry for edge ${edge.id}: Missing nodes`);
    }

    // 2. Instantiate correct engine
    if (geometry.type === 'straight') {
        return new StraightEngine(geometry);
    } else if (geometry.type === 'arc') {
        return new ArcEngine(geometry);
    }

    throw new Error(`[createGeometryEngine] Unknown geometry type: ${(geometry as { type: string }).type}`);
}
