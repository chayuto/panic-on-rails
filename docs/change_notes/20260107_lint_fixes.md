# Lint Warnings Fix

**Date:** 2026-01-07  
**Type:** Chore / Cleanup

## Summary

Addressed pre-existing ESLint warnings to ensure a clean codebase.

## Changes

1.  **`src/components/ui/Toolbar/FileActions.tsx`**
    *   Fixed `react-hooks/exhaustive-deps` warning by adding `performClear` to dependency array.
    *   Reordered functions to define `performClear` before usage to satisfy "used before declaration" typescript constraints.

2.  **`src/hooks/useEdgeGeometry.ts`**
    *   Fixed `react-hooks/exhaustive-deps` warning by removing redundant `edge.intrinsicGeometry` dependency (covered by `edge`).

## Verification

```bash
$ pnpm lint
# No output (clean)

$ pnpm test --run
Test Files  16 passed (16)
     Tests  394 passed (394)
```
