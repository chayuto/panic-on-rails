# Change Notes: E1-S1 Spatial Hash Grid Implementation

**Date:** 2026-01-03  
**Sprint:** E1-S1  
**Epic:** Performance Foundation  
**Status:** ✅ Complete

---

## Summary

Implemented Spatial Hash Grid for O(1) viewport culling. This foundational performance optimization enables the application to maintain 60fps even with large track layouts by only processing elements visible in the current viewport.

---

## Changes Made

### New Files

| File | Purpose |
|------|---------|
| `src/utils/spatialHashGrid.ts` | Core spatial hash grid data structure with O(1) insert/remove/query operations |
| `src/utils/__tests__/spatialHashGrid.test.ts` | Comprehensive test suite (25 tests) |
| `src/hooks/useVisibleEdges.ts` | React hooks for querying visible edges/nodes |

### Modified Files

| File | Changes |
|------|---------|
| `src/stores/useTrackStore.ts` | Integrated spatial indexing into all track operations; added `getVisibleEdges()` and `getVisibleNodes()` query methods |

---

## Technical Details

### SpatialHashGrid Class

The `SpatialHashGrid<T>` class divides the 2D canvas into fixed-size cells (500px default) and stores items in the cells they overlap. This enables:

- **O(1) Insert**: Add item to all overlapping cells
- **O(1) Remove**: Remove item from stored cells
- **O(1) Query**: Retrieve items in viewport cells (with deduplication)

```typescript
// Usage example
const grid = new SpatialHashGrid<EdgeId>(500);
grid.insert(edgeId, bounds, edgeId);
const visibleEdges = grid.queryIds(viewport);
```

### Integration with Track Store

The spatial indices are maintained as module-level variables (not persisted) and rebuilt automatically:

1. **On Add Track**: New edges/nodes inserted into spatial index
2. **On Remove Track**: Edges removed, orphaned nodes removed
3. **On Load Layout**: Full rebuild of both indices
4. **On Clear Layout**: Indices cleared
5. **On Hydration**: Rebuilt via `onRehydrateStorage` callback

### Helper Functions

- `getEdgeBounds(edge)`: Calculate bounding box for straight or arc geometry
- `getNodeBounds(node)`: Calculate 20x20 bounding box around node position
- `boundingBoxFromPoints()`: Create bbox from two endpoints
- `boundingBoxFromArc()`: Create conservative bbox for arc geometry

---

## Test Coverage

**25 new tests added** covering:

- Insert and query operations
- Multi-cell spanning items
- Remove operations
- Update operations
- Edge cases (negative coords, large items, duplicates)
- Helper functions (boundingBoxFromPoints, boundingBoxFromArc)

**Total test suite: 48/48 passing**

---

## Verification

| Check | Result |
|-------|--------|
| TypeScript | ✅ Pass |
| ESLint | ✅ Pass |
| Tests | ✅ 48/48 |

---

## Future Enhancements

This sprint provides the foundation for:

1. **E1-S2 Layer Refactor**: Use `getVisibleEdges()` to only render visible tracks
2. **E1-S3 Hit Detection**: Use spatial query for click-to-select instead of Konva hit graph
3. **Performance monitoring**: Track culled vs rendered element counts in debug overlay

---

## Usage Notes

### For Components

```tsx
import { useVisibleEdges, useVisibleNodes } from '../hooks/useVisibleEdges';

function TrackLayer({ viewport }: { viewport: BoundingBox }) {
    const visibleEdgeIds = useVisibleEdges(viewport);
    // Only render visible edges
}
```

### For Direct Store Access

```typescript
const visibleEdges = useTrackStore.getState().getVisibleEdges(viewport);
const visibleNodes = useTrackStore.getState().getVisibleNodes(viewport);
```

---

## Files Changed Summary

```
src/utils/spatialHashGrid.ts              (NEW)  - 240 lines
src/utils/__tests__/spatialHashGrid.test.ts (NEW)  - 215 lines
src/hooks/useVisibleEdges.ts              (NEW)  - 58 lines
src/stores/useTrackStore.ts               (MOD)  - +90 lines
```
