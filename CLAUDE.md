# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
It is the canonical guide for all coding agents (`AGENTS.md` points here).

## Read Order

1. This file — commands, architecture, conventions.
2. `docs/ROADMAP.md` — current state of the game, known gaps, and the phased plan. Check it before starting feature work.
3. `docs/architecture/constitution.md` — authoritative geometry/angle/connector rules. Required before touching `src/utils/`, `src/geometry/`, catalog, or track creators.
4. `.claude/skills/high-fidelity-frontend-testing/SKILL.md` — before writing E2E tests.

`docs/change_notes/` and `docs/research/` are historical records, not instructions. `docs/internal/` and `docs/personal/` are gitignored local notes; ignore them.

## Commands

```bash
pnpm dev          # Dev server at http://localhost:5173
pnpm build        # Production build (tsc -b && vite build)
pnpm test         # Run Vitest tests (watch mode)
pnpm test --run   # Single run (CI mode)
pnpm lint         # ESLint
pnpm typecheck    # TypeScript strict check (tsc -b; covers src, e2e, configs)
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

**Browser-based train track planner + simulator** using React 19, TypeScript 6 (strict), React-Konva for canvas rendering, and Zustand 5 for state management. Built with Vite 8; uses pnpm 11 on Node 24. Path alias: `@/` maps to `src/`.

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
- **useHistoryStore** — Undo/redo stacks. Undoable gestures call `record()` *before* mutating; snapshots cover track + logic + budget.

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

The simulation is a pure function plus thin adapters — keep it that way:

- **`src/simulation/step.ts`** — `stepSimulation(world, dt, ctx) → { world, events }`. Pure: no stores, audio, DOM, `performance.now()` or `Math.random()`. Order per tick: movement → collisions → debris → sensors/wires. Clock and RNG come in via `ctx` (`createRng(seed)` for determinism); side effects go out as typed `SimEvent`s (`traverse`, `bounce`, `collision`, `sensor`, `switch`, `signal`).
- Subsystems it calls: `movement.ts` (edge traversal, switch routing, dead-end bounce), `collision.ts` (+ `utils/collisionManager.ts`), `signals.ts` (sensor zones → wire actions), `utils/crashPhysics.ts` (debris; RNG-injected, never mutates input).
- **`src/simulation/tick.ts`** — `tickSimulation(realDt, { sink })` reads the stores, steps, writes back only what changed, logs to `simLog`, and hands events to a sink. `seedSimulation(n)` makes runs reproducible.
- **`src/hooks/useGameLoop.ts`** — rAF driver only: delta capping, error recovery, and `browserEffectsSink` (events → audio/flash/shake).
- **`src/simulation/harness.ts`** — headless API: `resetWorld()`, `loadRecipe(template)`, `seed()`, `run(frames)`, `runSeconds(s)`, `summarize()`.

New simulation behavior goes in `step.ts` or a subsystem, emits an event if it needs audio/FX, and gets a test in `src/simulation/__tests__/` (unit tests use the graph builders in `fixtures.ts`; `scenarios.test.ts` runs the shipped templates headlessly).

### Snap & Placement

`src/utils/snapManager.ts` handles multi-node snapping (switches, crossings). Snaps pivot connector rotation, not center. `src/utils/connectTransform.ts` handles facade mating, connection validation and transformation.

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

**Prefer headless first.** Most gameplay/simulation questions can be answered in Vitest with `src/simulation/harness.ts` — no browser, ~ms per simulated minute. Reach for the browser only for rendering, input, and layout.

`src/utils/debugBridge.ts` exposes all Zustand stores to `window.__PANIC_STORES__`, the Konva stage to `window.__PANIC_STAGE__`, and the simulation harness to `window.__PANIC_SIM__` (dev mode, `?e2e` param, or `localStorage.panic-e2e`). With the rAF loop paused, `__PANIC_SIM__.seed(1); __PANIC_SIM__.runSeconds(5)` steps the real simulation deterministically — no clock mocking or `waitForTimeout`. Playwright helpers in `e2e/helpers/` provide:

- **StoreBridge** — typed store access (read/write track, mode, simulation, editor state)
- **AgentActions** — semantic API: `placeTrack()`, `switchMode()`, `verify()`, `clickCanvas()`
- **ScreenshotManager** — paired `.png` + `.state.json` capture to `e2e-screenshots/`
- **ConsistencyChecker** — verifies rendered Konva shapes match store data

Two Playwright projects: `chromium` (CI, port 4173, builds first) and `dev` (agentic, port 5173, needs `pnpm dev` running + `PLAYWRIGHT_DEV=1`). Agent specs live in `e2e/specs/` (not run in CI); top-level `e2e/*.spec.ts` run in CI.
