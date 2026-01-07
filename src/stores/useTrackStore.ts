/**
 * Track Store - Main Export
 *
 * This store manages the track graph (nodes and edges) for the railway layout.
 * It uses the slice pattern to organize functionality into focused modules:
 *
 * - TrackSlice: CRUD operations (add, remove, load, save)
 * - ConnectionSlice: Network operations (connect, move, toggle)
 * - ViewSlice: Spatial queries (viewport culling)
 *
 * @see docs/internal/20260107_refactoring_overview.md
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackStore } from './slices';
import {
    createTrackSlice,
    createConnectionSlice,
    createViewSlice,
    rebuildSpatialIndices,
    getEdgeBounds,
    getNodeBounds,
} from './slices';

/**
 * Combined track store using slice pattern.
 *
 * Usage:
 * ```typescript
 * const { nodes, edges, addTrack, connectNetworks } = useTrackStore();
 * ```
 */
export const useTrackStore = create<TrackStore>()(
    persist(
        (...args) => ({
            // Combine all slices
            ...createTrackSlice(...args),
            ...createConnectionSlice(...args),
            ...createViewSlice(...args),
        }),
        {
            name: 'panic-on-rails-v1',

            // Rebuild spatial indices after hydration and migrate legacy data
            onRehydrateStorage: () => (state) => {
                if (state) {
                    // MIGRATION: Fix angles (radian -> degree) for legacy data
                    // If we see very small effective sweeps for large radius arcs, it's likely radians
                    let migratedCount = 0;

                    Object.values(state.edges).forEach(edge => {
                        if (edge.geometry.type === 'arc') {
                            const sweep = Math.abs(edge.geometry.endAngle - edge.geometry.startAngle);
                            // Heuristic: If sweep is < 15 degrees and radius > 50mm, it's likely radians (PI/2 = 1.57)
                            if (sweep < 15 && edge.geometry.radius > 50) {
                                edge.geometry.startAngle = (edge.geometry.startAngle * 180) / Math.PI;
                                edge.geometry.endAngle = (edge.geometry.endAngle * 180) / Math.PI;
                                migratedCount++;
                            }
                        }
                    });

                    if (migratedCount > 0) {
                        console.log(`[useTrackStore] Migrated ${migratedCount} legacy arcs from radians to degrees`);
                    }

                    // V2 MIGRATION: Add intrinsicGeometry to edges that don't have it
                    let v2MigratedCount = 0;
                    for (const [edgeId, edge] of Object.entries(state.edges)) {
                        if (!edge.intrinsicGeometry) {
                            if (edge.geometry.type === 'straight') {
                                const dx = edge.geometry.end.x - edge.geometry.start.x;
                                const dy = edge.geometry.end.y - edge.geometry.start.y;
                                const length = Math.sqrt(dx * dx + dy * dy);

                                state.edges[edgeId] = {
                                    ...edge,
                                    intrinsicGeometry: { type: 'straight', length },
                                };
                                v2MigratedCount++;
                            } else if (edge.geometry.type === 'arc') {
                                const sweepAngle = Math.abs(edge.geometry.endAngle - edge.geometry.startAngle);
                                const direction: 'cw' | 'ccw' =
                                    edge.geometry.endAngle > edge.geometry.startAngle ? 'ccw' : 'cw';

                                state.edges[edgeId] = {
                                    ...edge,
                                    intrinsicGeometry: {
                                        type: 'arc',
                                        radius: edge.geometry.radius,
                                        sweepAngle,
                                        direction,
                                    },
                                };
                                v2MigratedCount++;
                            }
                        }
                    }

                    if (v2MigratedCount > 0) {
                        console.log(`[V2 Migration] Added intrinsicGeometry to ${v2MigratedCount} edges`);
                    }

                    rebuildSpatialIndices(state.nodes, state.edges);
                    console.log('[useTrackStore] Spatial indices rebuilt after hydration');
                }
            },
        }
    )
);

// ===========================
// Re-exports for Backward Compatibility
// ===========================

// These were previously exported from this file
// Keep them for consumers that import from here
export { getEdgeBounds, getNodeBounds };
export type { BoundingBox } from './slices';
