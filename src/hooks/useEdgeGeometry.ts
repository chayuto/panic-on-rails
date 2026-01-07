/**
 * useEdgeGeometry - Hook for deriving world geometry from intrinsic geometry
 * 
 * V2 Architecture: This hook provides derived world geometry for track edges,
 * computing center/angles from node positions and intrinsic properties rather
 * than using stored geometry values.
 * 
 * @see docs/internal/20260106_v2_architecture_refactoring_plan.md
 */

import { useMemo } from 'react';
import type { TrackEdge, TrackNode, TrackGeometry, NodeId } from '../types';
import { deriveWorldGeometry } from '../utils/geometry';

/**
 * Hook to get world geometry for an edge.
 * 
 * Uses derived geometry from intrinsicGeometry if available,
 * falls back to stored geometry if not.
 * 
 * @param edge - The track edge
 * @param nodes - All nodes in the graph
 * @returns World geometry (or null if nodes missing)
 */
export function useEdgeGeometry(
    edge: TrackEdge,
    nodes: Record<NodeId, TrackNode>
): TrackGeometry | null {
    return useMemo(() => {
        return deriveWorldGeometry(edge, nodes);
    }, [edge, nodes]);
}

/**
 * Get world geometry for an edge without React hooks.
 * 
 * Useful in non-React contexts like hit testing.
 * 
 * @param edge - The track edge
 * @param nodes - All nodes in the graph
 * @returns World geometry (or null if nodes missing)
 */
export function getEdgeWorldGeometry(
    edge: TrackEdge,
    nodes: Record<NodeId, TrackNode>
): TrackGeometry | null {
    return deriveWorldGeometry(edge, nodes);
}
