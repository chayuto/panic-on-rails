# Task Completion Report: useConnectMode Hook Tests + Bug Fix

**Date:** 2026-01-07  
**Task:** Implement useConnectMode hook tests (Phase 2 of testing strategy)  
**Status:** ✅ Complete

## Summary

Implemented 30 functional tests for `useConnectMode` hook logic. **Discovered and fixed a production bug** in `validateConnection()` that prevented connecting two tracks of the same catalog type.

## Changes Made

### New Files
| File | Description |
|------|-------------|
| `src/hooks/__tests__/useConnectMode.test.ts` | 30 functional tests |

### Bug Fixed
| File | Issue | Fix |
|------|-------|-----|
| `src/utils/connectTransform.ts` | `validateConnection()` compared `partId` (catalog type) instead of edge IDs | Changed to compare unique edge IDs |

### Test Coverage
| Category | Tests |
|----------|-------|
| isValidConnectTarget | 7 |
| handleFirstClick | 6 |
| handleSecondClick | 6 |
| cancelConnect/exitConnectMode | 4 |
| Integration | 4 |
| validateConnection | 3 |
| **Total** | **30** |

## Bug Details

**Location:** `validateConnection()` in `src/utils/connectTransform.ts`

**Symptom:** Two separate tracks of the same type (e.g., two "kato-20-020" straight tracks) could not be connected.

**Root Cause:** Code compared `edgeA.partId === edgeB.partId` where `partId` is the catalog part type (like "kato-20-020"), not the unique edge ID.

**Fix:** Changed comparison to `edgeIdA === edgeIdB` to check if nodes belong to the same physical track instance.

## Verification

```bash
$ pnpm test --run
Test Files  15 passed (15)
     Tests  378 passed (378)

$ pnpm lint
✖ 2 problems (0 errors, 2 warnings)  # Pre-existing warnings only
```

## Combined Test Count (Phase 1 + Phase 2)
- **useTrackStore tests:** 82
- **useConnectMode tests:** 30
- **Total new tests added:** 112
