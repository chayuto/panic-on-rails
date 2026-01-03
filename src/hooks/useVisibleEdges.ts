import { useMemo } from 'react';
import { useTrackStore, type BoundingBox } from '../stores/useTrackStore';

/**
 * Hook to get visible edge IDs within a viewport.
 * Uses spatial hash grid for O(1) performance.
 * 
 * @param viewport - The viewport rectangle to query
 * @returns Array of EdgeIds that are visible within the viewport
 */
export function useVisibleEdges(viewport: BoundingBox | null): string[] {
    const getVisibleEdges = useTrackStore((s) => s.getVisibleEdges);
    const edgeCount = useTrackStore((s) => Object.keys(s.edges).length);

    return useMemo(() => {
        if (!viewport) {
            // If no viewport specified, return all edges
            return useTrackStore.getState().edges
                ? Object.keys(useTrackStore.getState().edges)
                : [];
        }
        return getVisibleEdges(viewport);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        getVisibleEdges,
        viewport?.x,
        viewport?.y,
        viewport?.width,
        viewport?.height,
        edgeCount, // Re-run when edges change
    ]);
}

/**
 * Hook to get visible node IDs within a viewport.
 * Uses spatial hash grid for O(1) performance.
 * 
 * @param viewport - The viewport rectangle to query
 * @returns Array of NodeIds that are visible within the viewport
 */
export function useVisibleNodes(viewport: BoundingBox | null): string[] {
    const getVisibleNodes = useTrackStore((s) => s.getVisibleNodes);
    const nodeCount = useTrackStore((s) => Object.keys(s.nodes).length);

    return useMemo(() => {
        if (!viewport) {
            // If no viewport specified, return all nodes
            return useTrackStore.getState().nodes
                ? Object.keys(useTrackStore.getState().nodes)
                : [];
        }
        return getVisibleNodes(viewport);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        getVisibleNodes,
        viewport?.x,
        viewport?.y,
        viewport?.width,
        viewport?.height,
        nodeCount, // Re-run when nodes change
    ]);
}
