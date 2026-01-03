# Change Note: Split Toolbar (Task 3)

**Date:** 2026-01-03  
**Epic:** Core System Mode Revamp  
**Task:** MODE-003  
**Status:** ✅ Complete  

---

## Summary

Refactored the monolithic 265-line `Toolbar.tsx` into 5 focused sub-components within a new `Toolbar/` directory. This improves maintainability, enables faster re-renders by separating concerns, and sets the stage for mode-specific conditional rendering in future tasks.

---

## Files Changed

### Created (New Directory: `src/components/ui/Toolbar/`)

| File | Lines | Description |
|------|-------|-------------|
| `FileActions.tsx` | 140 | New, Templates, Save, Load buttons |
| `ViewActions.tsx` | 45 | Grid, Reset, Mute buttons |
| `EditToolbar.tsx` | 66 | Data-driven edit mode tool buttons |
| `SimulateToolbar.tsx` | 61 | Play/Pause, Add Train buttons |
| `index.tsx` | 68 | Main component + re-exports |

### Deleted

| File | Reason |
|------|--------|
| `src/components/ui/Toolbar.tsx` | Replaced by new directory structure |

---

## Architecture Improvements

### Before: Monolithic Component

```
Toolbar.tsx (265 lines)
├── All state hooks
├── All handlers  
├── All buttons in single JSX tree
└── MuteToggle inline component
```

### After: Composed Components

```
Toolbar/
├── index.tsx        → Layout + composition
├── FileActions.tsx  → File ops, self-contained
├── ViewActions.tsx  → View controls, self-contained
├── EditToolbar.tsx  → Data-driven tool buttons
└── SimulateToolbar.tsx → Simulation controls
```

### Benefits

1. **Smaller files**: Each file has single responsibility
2. **Better re-renders**: Only affected component re-renders
3. **Data-driven**: EditToolbar uses array config for tools
4. **Extensible**: Easy to add ModeToggle (Task 4)
5. **Testable**: Each component can be unit tested

---

## Key Implementation Details

### EditToolbar Data-Driven Design

```typescript
const EDIT_TOOLS: ToolButton[] = [
    { mode: 'select', icon: '✏️', label: 'Edit', title: '...' },
    { mode: 'delete', icon: '🗑️', label: 'Delete', title: '...' },
    // ... easily add new tools
];
```

### Import Compatibility

The `index.tsx` file ensures existing imports work unchanged:
```typescript
// Still works - resolves to Toolbar/index.tsx
import { Toolbar } from './components/ui/Toolbar';
```

### Re-exports for Direct Access

```typescript
export { FileActions } from './FileActions';
export { ViewActions } from './ViewActions';
export { EditToolbar } from './EditToolbar';
export { SimulateToolbar } from './SimulateToolbar';
```

---

## Verification Results

```
✅ pnpm tsc --noEmit     - No errors
✅ pnpm lint             - 0 errors (1 pre-existing warning)
✅ pnpm test --run       - 106/106 tests pass
✅ pnpm build            - Production build successful
```

---

## Next Steps

**Task 4: Mode Toggle UX** (2 SP)
- Create prominent ModeToggle component
- Add keyboard shortcut (M key)
- Visual distinction between Edit/Simulate modes
