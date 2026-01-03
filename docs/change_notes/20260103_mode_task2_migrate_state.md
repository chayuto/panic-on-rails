# Change Note: Migrate Mode State (Task 2)

**Date:** 2026-01-03  
**Epic:** Core System Mode Revamp  
**Task:** MODE-002  
**Status:** ✅ Complete  

---

## Summary

Migrated all mode-related state from `useEditorStore` to the new `useModeStore`. Removed the deprecated `mode` field and `setMode` action from `useEditorStore`.

---

## Files Changed

### Modified

| File | Changes |
|------|---------|
| `src/stores/useEditorStore.ts` | Removed `mode`, `setMode`; removed `EditorMode` import |
| `src/components/ui/Toolbar.tsx` | Import `useModeStore`; use `editSubMode`, `setEditSubMode`, `enterEditMode`, `enterSimulateMode` |
| `src/components/canvas/TrackLayer.tsx` | Import `useModeStore`, `useIsEditing`; update mode checks |
| `src/components/canvas/SensorLayer.tsx` | Import `useModeStore`; use `editSubMode` |
| `src/components/canvas/SignalLayer.tsx` | Import `useModeStore`, `useIsSimulating`; update mode checks |
| `src/components/canvas/WireLayer.tsx` | Import `useModeStore`; use `primaryMode`, `editSubMode` |
| `src/App.tsx` | Add subscription to clear `wireSource` on mode change |

---

## Migration Details

### API Changes

| Old API | New API |
|---------|---------|
| `mode` (from useEditorStore) | `primaryMode`, `editSubMode` (from useModeStore) |
| `setMode('edit')` | `enterEditMode()` or `setEditSubMode('select')` |
| `setMode('simulate')` | `enterSimulateMode()` |
| `setMode('sensor')` | `setEditSubMode('sensor')` |
| `setMode('signal')` | `setEditSubMode('signal')` |
| `setMode('wire')` | `setEditSubMode('wire')` |
| `setMode('delete')` | `setEditSubMode('delete')` |
| `mode === 'edit'` | `editSubMode === 'select'` or `useIsEditing()` |
| `mode === 'simulate'` | `primaryMode === 'simulate'` or `useIsSimulating()` |

### Mode Check Semantics

The old flat mode system conflated primary modes with sub-modes:
```typescript
// OLD: 'edit' was a peer to 'sensor', 'signal', etc.
if (mode === 'edit') { ... }
if (mode === 'sensor') { ... }
```

The new hierarchy separates concerns:
```typescript
// NEW: Primary mode + sub-mode
if (useIsEditing()) { ... }              // Am I in edit context?
if (editSubMode === 'sensor') { ... }    // Which edit tool is active?
```

### Side Effects

The old `setMode()` cleared `wireSource` automatically. This behavior is now handled by a subscription in `App.tsx`:

```typescript
useEffect(() => {
    const editorStore = useEditorStore.getState();
    editorStore.clearWireSource();
    editorStore.endDrag();
}, [primaryMode]);  // Runs when primary mode changes
```

---

## Files Unchanged

- `src/components/canvas/StageWrapper.tsx` - Did not use `mode` directly
- `src/components/canvas/GhostLayer.tsx` - Did not use `mode`
- `src/components/ui/PartsBin.tsx` - Did not use `mode`

---

## Verification Results

```
✅ pnpm tsc --noEmit      - No errors
✅ pnpm lint              - 0 errors (1 pre-existing warning)
✅ pnpm test --run        - 106/106 tests pass
```

---

## Behavior Changes

1. **Edit button now sets `'select'`**: The "Edit" button in Toolbar now sets `editSubMode='select'` instead of `mode='edit'`.

2. **Mode context awareness**: TrackLayer, SignalLayer now check `useIsEditing()` or `useIsSimulating()` to determine if they should handle clicks.

3. **Wire visibility**: WireLayer now shows wires when `editSubMode === 'select'` (previously `mode === 'edit'`).

---

## Next Steps

**Task 3: Split Toolbar into Sub-Components**
- Create `src/components/ui/Toolbar/` directory
- Extract `FileActions`, `ViewActions`, `ModeToggle`, `EditToolbar`, `SimulateToolbar`
