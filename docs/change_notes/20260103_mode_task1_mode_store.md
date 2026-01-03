# Change Note: Mode Store Foundation (Task 1)

**Date:** 2026-01-03  
**Epic:** Core System Mode Revamp  
**Task:** MODE-001  
**Status:** ✅ Complete  

---

## Summary

Created the foundation for the new 2-level mode system, replacing the flat `EditorMode` type with a hierarchical structure:

- **Primary Mode**: `'edit'` | `'simulate'` - the main application context
- **Edit Sub-Mode**: `'select'` | `'place'` | `'delete'` | `'sensor'` | `'signal'` | `'wire'`
- **Simulate Sub-Mode**: `'observe'` | `'interact'`

---

## Files Changed

### Created

| File | Lines | Description |
|------|-------|-------------|
| `src/types/mode.ts` | 125 | Type definitions, defaults, type guards, legacy mapping |
| `src/stores/useModeStore.ts` | 266 | Zustand store with actions, selectors, convenience hooks |
| `src/stores/__tests__/useModeStore.test.ts` | 340 | 34 comprehensive unit tests |

### Modified

| File | Change |
|------|--------|
| `src/types/index.ts` | Added re-exports for mode types; added `@deprecated` notice to `EditorMode` |

---

## Key Design Decisions

### 1. Separate Type File (`types/mode.ts`)
Rather than adding to `types/index.ts` directly, mode types get their own file. This:
- Keeps related types together
- Allows for future expansion (e.g., more sub-modes)
- Makes circular dependency management easier

### 2. `subscribeWithSelector` Middleware
The store uses Zustand's `subscribeWithSelector` middleware, enabling:
```typescript
useModeStore.subscribe(
    state => state.primaryMode,
    (current, previous) => { /* react to changes */ }
);
```
This pattern allows external code to react to mode changes without tight coupling.

### 3. Transition Actions vs Direct Setters
The store provides both:
- **Direct setters** (`setPrimaryMode`, `setEditSubMode`): For fine-grained control
- **Transition actions** (`enterEditMode`, `enterSimulateMode`): For proper cleanup and side effects

UI code should prefer transition actions for consistency.

### 4. Type Guards for Runtime Validation
```typescript
function isPrimaryMode(value: unknown): value is PrimaryMode
function isEditSubMode(value: unknown): value is EditSubMode
function isSimulateSubMode(value: unknown): value is SimulateSubMode
```
These enable runtime type checking, useful for:
- Validating user input
- Migrating persisted state
- Defensive programming

### 5. Legacy Mode Mapping
A `LEGACY_MODE_MAPPING` constant provides a clear migration path:
```typescript
'sensor' -> { primary: 'edit', sub: 'sensor' }
'delete' -> { primary: 'edit', sub: 'delete' }
```
This aids Task 2 (migration) and documents the relationship.

---

## API Reference

### Store Usage

```typescript
import { 
    useModeStore,
    useIsEditing,
    useIsSimulating,
    usePrimaryMode,
    useEditSubMode
} from './stores/useModeStore';

// Convenience hooks (recommended)
const isEditing = useIsEditing();
const mode = usePrimaryMode();

// Full state access
const { primaryMode, editSubMode, setEditSubMode } = useModeStore();

// Actions only (no re-renders)
const actions = useModeStore.getState();
actions.togglePrimaryMode();
```

### Type Imports

```typescript
import type { 
    PrimaryMode, 
    EditSubMode, 
    SimulateSubMode, 
    ModeState 
} from './types';

// Or from mode directly
import { DEFAULT_MODE_STATE, isPrimaryMode } from './types/mode';
```

---

## Test Coverage

| Category | Tests | Status |
|----------|-------|--------|
| Initial state | 4 | ✅ |
| setPrimaryMode | 4 | ✅ |
| togglePrimaryMode | 3 | ✅ |
| setEditSubMode | 4 | ✅ |
| setSimulateSubMode | 3 | ✅ |
| enterEditMode | 3 | ✅ |
| enterSimulateMode | 3 | ✅ |
| resetMode | 1 | ✅ |
| Selectors | 4 | ✅ |
| Subscriptions | 3 | ✅ |
| Integration | 2 | ✅ |
| **Total** | **34** | ✅ |

---

## Verification Results

```
✅ pnpm tsc --noEmit      - No errors
✅ pnpm lint              - 0 errors (1 pre-existing warning)
✅ pnpm test --run        - 106/106 tests pass
```

---

## Next Steps

**Task 2: Migrate Mode State from useEditorStore**
- Remove `mode` and `setMode` from `useEditorStore`
- Update all consumers to use `useModeStore`
- Update Toolbar, StageWrapper, and layer components
