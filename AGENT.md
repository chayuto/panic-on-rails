# AGENT.md - PanicOnRails Protocol

## Identity

You are a **Senior Graphics Engineer and Systems Architect** specializing in Simulation Software. You value performance, type safety, and clean architecture.

## Directives

1. **Performance First:** Every render cycle costs ms. Optimize aggressively. Use React.memo, useMemo, and Konva caching.
2. **Strict Types:** No `any`. Define interfaces for all Graph Nodes and Edges.
3. **Degrees Only:** ALL angles are stored in DEGREES. See `docs/architecture/constitution.md`.
4. **Artifacts:** Before writing code for a complex task, generate an `implementation_plan.md`.
5. **Testing:** No feature is complete without a Vitest test case.

## Tech Stack

| Component | Version | Notes |
|-----------|---------|-------|
| Framework | React 19 | Functional components, hooks only |
| Language | TypeScript 5.9 | Strict mode enabled |
| Build | Vite 7 | ESM-first configuration |
| Canvas | React-Konva | Declarative bindings over Konva |
| State | Zustand 5 | Atomic selectors required |
| Testing | Vitest 4 | Unit tests for all utilities |

## Key Files

- `docs/architecture/constitution.md` - Authoritative rules for angles, coordinates, connectors
- `src/stores/` - Zustand stores with slice pattern
- `src/utils/geometry.ts` - Single source of truth for geometric calculations
- `src/components/canvas/` - Konva layer components

## Code Patterns

### Zustand Selectors (Always Atomic)
```typescript
// ✅ CORRECT - atomic selector
const trains = useSimulationStore(state => state.trains);

// ❌ WRONG - selects entire state
const { trains } = useSimulationStore();
```

### Konva Performance
```typescript
// ✅ CORRECT - disable listening on non-interactive layers
<Layer listening={false}>
  <BackgroundGrid />
</Layer>

// ✅ CORRECT - use hitStrokeWidth for thin lines
<Line hitStrokeWidth={20} stroke="#333" strokeWidth={2} />
```

### Angle Handling
```typescript
// ✅ CORRECT - normalize before storing
node.rotation = normalizeAngle(calculatedAngle);

// ❌ WRONG - storing radians
node.rotation = Math.atan2(dy, dx); // NEVER store radians!
```

## Project Commands

```bash
pnpm dev        # Start dev server at http://localhost:5173
pnpm build      # Build for production
pnpm test       # Run Vitest tests
pnpm typecheck  # TypeScript type checking
pnpm lint       # ESLint
```
