# Enable Closed Track Loops

**Date:** 2026-01-07  
**Type:** Enhancement / Bug Fix

## Summary

Removed cycle detection from `validateConnection()` to enable closed loop track layouts. Two open endpoints connecting creates a valid circuit, not a problematic cycle.

## Problem

The testing phase discovered that `validateConnection()` blocked closing loops:
- Sequential connections worked correctly
- Final connection to close the loop was rejected
- Error: "Parts are already connected (would create cycle)"

## Solution

**Insight:** The cycle detection was unnecessary for open endpoints. When two nodes each have exactly 1 connection, connecting them creates a valid closed circuit - this is essential for train tracks.

**Changes:**
- Removed cycle detection from `validateConnection()` in `connectTransform.ts`
- Removed dead code: `areNodesConnected()` function (45 lines)
- Updated documentation in function JSDoc

## Files Changed

| File | Change |
|------|--------|
| `src/utils/connectTransform.ts` | Removed cycle detection, removed `areNodesConnected` |
| `src/stores/__tests__/circuitFormation.test.ts` | Updated test to verify loops work |
| `src/hooks/__tests__/useConnectMode.test.ts` | Updated test to verify loops work |

## Verification

```bash
$ pnpm test --run
Test Files  16 passed (16)
     Tests  394 passed (394)

$ pnpm lint
✖ 2 problems (0 errors, 2 warnings)  # Pre-existing only
```

## Impact

- **Closed loop tracks now work** - trains can run continuously
- **Acceptance criteria met** - 0 open endpoints after full circuit formation
- **No breaking changes** - same API, just removed unnecessary restriction
