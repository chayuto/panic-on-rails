/**
 * React views of the player's collection: owned, on the table, and left.
 */

import { useMemo } from 'react';
import { useCollectionStore } from '../stores/useCollectionStore';
import { useTrackStore } from '../stores/useTrackStore';
import { countPlacedPieces, inventoryOf, piecesLeft, type PartCounts } from '../data/collection';

/** Every piece the player owns. */
export function useInventory(): PartCounts {
    const ownedSets = useCollectionStore(s => s.ownedSets);
    const looseParts = useCollectionStore(s => s.looseParts);
    return useMemo(() => inventoryOf(ownedSets, looseParts), [ownedSets, looseParts]);
}

/** Pieces on the table, per part. */
export function usePlacedPieces(): PartCounts {
    const edges = useTrackStore(s => s.edges);
    return useMemo(() => countPlacedPieces(edges), [edges]);
}

/** Pieces still in the box, per part. */
export function usePiecesLeft(): PartCounts {
    const inventory = useInventory();
    const placed = usePlacedPieces();
    return useMemo(() => piecesLeft(inventory, placed), [inventory, placed]);
}
