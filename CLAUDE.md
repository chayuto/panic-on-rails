# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Dev server at http://localhost:5173
pnpm build        # Production build (tsc -b && vite build)
pnpm test         # Run Vitest tests (watch mode)
pnpm test --run   # Single run (CI mode)
pnpm lint         # ESLint
pnpm typecheck    # TypeScript strict check (tsc --noEmit)
```

Run a single test file:
```bash
pnpm test --run src/utils/__tests__/geometry.test.ts
```

E2E / Browser testing:
```bash
pnpm e2e                  # CI E2E tests (builds + preview server)
PLAYWRIGHT_DEV=1 pnpm exec playwright test --project=dev  # Agent tests (needs pnpm dev running)
```

## Architecture

**Browser-based train track planner + simulator** using React 19, TypeScript 5.9 (strict), React-Konva for canvas rendering, and Zustand 5 for state management. Built with Vite; uses pnpm. Path alias: `@/` maps to `src/`.

### Canvas Rendering (React-Konva)

`StageWrapper` contains ordered layers: Background → Track → Ghost (placement previews) → Train → Sensor → Signal → Wire → Effects → Crash. Each is a Konva `<Layer>`. Non-interactive layers use `listening={false}`. Viewport culling (`viewportCulling.ts`) skips off-screen elements.

### State Management (Zustand Slice Pattern)

Persisted stores (localStorage):
- **useTrackStore** (`panic-on-rails-v1`) — Primary store. Composed from slices: `createTrackSlice`, `createConnectionSlice`, `createViewSlice`. Contains all track nodes/edges. Has migration logic in `onRehydrateStorage` (radian→degree conversion, rebuilds spatial indices).
- **useLogicStore** — Sensors, signals, wires.
- **useBudgetStore** — Player budget for track purchases.
- **useOnboardingStore** — Tutorial progress.

Non-persisted stores (reset on refresh):
- **useModeStore** — Edit/Simulate mode + sub-modes (select, place, delete, sensor, signal, wire, connect).
- **useSimulationStore** — Train positions, speeds, collision state. Includes `setError()`/`clearError()` for simulation errors.
- **useEditorStore** — Transient UI state (dragging, selection, ghost previews).
- **useEffectsStore** — Visual/audio effects (screen shake, flash).

Always use atomic selectors: `useTrackStore(s => s.nodes)` not `useTrackStore()`. Use named selectors for derived reads (e.g., `selectTrains`, `selectError`).

### Graph Data Model

Track layouts are stored as a graph of `TrackNode` (connection points) and `TrackEdge` (track segments with `StraightGeometry` or `ArcGeometry`). Nodes have `position`, `rotation` (world facade direction), and `connections` (edge IDs). Edges reference start/end node IDs and hold intrinsic geometry.

### Key Domain Rules (from `docs/architecture/constitution.md`)

- **ALL angles in DEGREES**, normalized to [0, 360) before storage. Radians only at point of `Math.sin`/`Math.cos` calls.
- **Tracks are bidirectional** — only trains have a `direction` (+1/-1). "A/B", "start/end" labels are for identification, not travel direction.
- **Connector mating**: two connectors connect when their facades are 180° apart (within tolerance). Default tolerance: 15° (n-scale), 20° (wooden).
- `normalizeAngle()` must be called before storing any angle.
- **Coordinate system**: origin top-left, +X right, +Y down, 0° points right (east), positive angles rotate clockwise.

### Geometry System

`src/utils/geometry.ts` is the single source of truth for geometric calculations. Intrinsic geometry (movement-invariant: length, radius, sweep) is stored on edges; world geometry (actual coordinates) is derived from intrinsic + node positions.

### Track Parts Catalog

`src/data/catalog/` contains brand definitions (`brands/`), part definitions as JSON (`parts/`), connector specs per part type (`connectors/`), and Zod schemas for validation. Supports Kato N-Scale, Brio, IKEA. `helpers.ts` has `computeConnectors()` factory for all part types. Four specialized track creators in `src/stores/slices/trackCreators/`: standard, switch, crossing, curve.

### Simulation System

`src/hooks/useGameLoop.ts` orchestrates four sub-systems each frame via `requestAnimationFrame` with delta time capping:
1. `calculateTrainMovement()` — Train position along edges (`src/simulation/movement.ts`)
2. `checkCollisions()` — Spatial hash grid + bounding box tests (`src/simulation/collision.ts`)
3. `updateSensors()` — Sensor/signal state from train proximity (`src/simulation/signals.ts`)
4. Effects update — Visual/audio feedback

### Snap & Placement

`src/utils/snapManager.ts` handles multi-node snapping (switches, crossings). Snaps pivot connector rotation, not center. `src/utils/facadeConnection.ts` handles facade alignment. `src/utils/connectTransform.ts` handles connection transformation.

### File Export/Import

`src/utils/fileManager.ts` exports/imports layouts as JSON with Zod validation (`src/schemas/layout.ts`). Uses `file-saver` for downloads. Validates with `LayoutDataSchema.safeParse()` on import.

## Key Conventions

- React functional components + hooks only (no class components)
- Performance-first: use `React.memo`, `useMemo`, Konva caching; optimize render cycles
- No `any` types — define interfaces for all graph structures
- `src/config/` holds physics, timing, rendering, and interaction constants
- Vitest tests live in `__tests__/` directories adjacent to source files
- `src/setupTests.ts` mocks localStorage for Zustand persist in tests

### Agentic Dev-Test Infrastructure

`src/utils/debugBridge.ts` exposes all Zustand stores to `window.__PANIC_STORES__` and Konva stage to `window.__PANIC_STAGE__` (dev mode or `?e2e` param). Playwright helpers in `e2e/helpers/` provide:

- **StoreBridge** — typed store access (read/write track, mode, simulation, editor state)
- **AgentActions** — semantic API: `placeTrack()`, `switchMode()`, `verify()`, `clickCanvas()`
- **ScreenshotManager** — paired `.png` + `.state.json` capture to `e2e-screenshots/`
- **ConsistencyChecker** — verifies rendered Konva shapes match store data

Two Playwright projects: `chromium` (CI, port 4173, builds first) and `dev` (agentic, port 5173, needs `pnpm dev` running + `PLAYWRIGHT_DEV=1`). Agent specs live in `e2e/specs/`.
