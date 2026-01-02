# Sprint 3A Task 1: Node Connection Fix

**Date:** 2026-01-03
**Status:** ✅ COMPLETE

---

## Problem

When users dropped a track near an existing endpoint:
- Tracks appeared visually connected (cyan junction dot)
- BUT the graph nodes were NOT merged correctly
- Trains could NOT traverse between snapped tracks

## Root Cause

In `StageWrapper.tsx` `handleDrop()`:
```typescript
// BEFORE: Always merged startNodeId
connectNodes(snapTarget.targetNodeId, newEdge.startNodeId, newEdgeId);
```

The bug: When `addTrack` creates a new edge, it puts `startNodeId` at position (0,0) relative to the track origin and `endNodeId` at the track's length. But depending on rotation/position, the snapped endpoint could be **either** node.

The code always merged `startNodeId`, which was often the **wrong** node.

## Solution

Compare distances from both nodes to the snap target position:
```typescript
// AFTER: Determine which node is actually at the snap position
const distToStart = Math.hypot(
    startNode.position.x - snapTarget.targetPosition.x,
    startNode.position.y - snapTarget.targetPosition.y
);
const distToEnd = Math.hypot(
    endNode.position.x - snapTarget.targetPosition.x,
    endNode.position.y - snapTarget.targetPosition.y
);

// The node closer to snap target is the one that should be merged
const nodeToRemove = distToStart < distToEnd ? newEdge.startNodeId : newEdge.endNodeId;
connectNodes(snapTarget.targetNodeId, nodeToRemove, newEdgeId);
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/canvas/StageWrapper.tsx` | Fixed node selection logic in `handleDrop()` |
| `src/components/ui/Toolbar.tsx` | Added localStorage clear to "New Layout" button |

## Verification

- ✅ TypeScript compiles with no errors
- ✅ All 8 unit tests pass
- ✅ Browser test: Train successfully traverses junction
- ✅ Console log shows `survivorConnectionsNow: 2` (correct)

## Test Recording

See: `test_node_fix_v2_1767393720921.webp`
