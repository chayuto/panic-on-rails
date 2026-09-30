# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
It is the canonical guide for all coding agents (`AGENTS.md` points here).

## What This Is

**A virtual model railway**: for people who love model trains but can't buy the real parts. Open a real starter set, build real layouts with accurately modelled track, run the trains, and keep expanding. Design: `docs/design/virtual-model-railway.md`.

Authenticity is a requirement, not polish:
- A catalog part is a real product: manufacturer's number, name and exact geometry. Cite the source (`referenceUrl` or the design doc) when adding or changing one.
- A boxed set (`src/data/sets/`) contains exactly what the real box contains, and its plans must close. `sets.test.ts` enforces this; never loosen it to make a plan pass.
- Don't invent products. A generic helper piece must be named and flagged as such.

## Read Order

1. This file — commands, architecture, conventions.
2. `docs/ROADMAP.md` — current state of the game, known gaps, and the phased plan. Check it before starting feature work.
   `docs/design/virtual-model-railway.md` — product design and the research on real sets.
3. `docs/architecture/constitution.md` — authoritative geometry/angle/connector rules. Required before touching `src/utils/`, `src/geometry/`, catalog, or track creators.
4. `.claude/skills/high-fidelity-frontend-testing/SKILL.md` — before writing E2E tests.

`docs/change_notes/` and `docs/research/` are historical records, not instructions. `docs/internal/` and `docs/personal/` are gitignored local notes; ignore them.

## Commands

```bash
pnpm dev          # Dev server at http://localhost:5173
pnpm build        # Production build (tsc -b && vite build)
pnpm test         # Run Vitest tests (watch mode)
pnpm test --run   # Single run
pnpm test:coverage # Single run with coverage floors per area (what CI runs)
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

`StageWrapper` has four Konva layers:
1. Background.
2. Track, plus wires, sensors and signals.
3. Ghost (placement preview, while dragging).
4. Trains, crash debris and effects (`listening={false}`).

Rendering rules. They come from a measured budget (ROADMAP Phase 5); break them and a big layout drops from 120 fps to single digits.
- **Track is painted, not composed.** One `Shape` in `TrackLayer` calls `tracks/trackPainter.ts`, which draws roadbed, sleepers and rails for every visible edge in batched paths. Detail depends on zoom: no sleepers below 0.7 px/mm, a single line per track below 0.35. Editing adds invisible `EdgeHitTarget` click bands, and joint dots only appear in Edit mode.
- **Trains are drawn imperatively.** One `Shape` in `TrainLayer` reads the stores at draw time and stamps pre-drawn car sprites (`trains/carSprites.ts`), placed by `utils/trainCars.ts`. A store subscription redraws it after each simulation step. Never subscribe a canvas component to `trains` with a hook.
- **No Konva shadows** (`shadowBlur`), and set `perfectDrawEnabled={false}` on filled+stroked shapes. Konva renders those through a full-screen scratch canvas per shape per frame. Bake shadows into sprites instead.
- **Use atomic store selectors.** A whole-store `useX()` in `StageWrapper` or its hooks re-renders the canvas on every tick.
- Rolling stock sizes live in `src/config/rollingStock.ts`.
  - A train's position is its leading car's front bogie, and `train.trail` records the route it came through, so the cars follow it through turnouts.
  - Turning back never moves a car. `reverseConsist` makes the far end lead and flips `train.locoLeading` (the locomotive pushes from the back); the step, the direction lever and buffer stops all go through it.

### State Management (Zustand Slice Pattern)

Persisted stores (localStorage):
- **useTrackStore** (`panic-on-rails-v1`) — Primary store. Composed from slices: `createTrackSlice`, `createConnectionSlice`, `createViewSlice`. Contains all track nodes/edges. Has migration logic in `onRehydrateStorage` (radian→degree conversion, rebuilds spatial indices).
- **useLogicStore** — Sensors, signals, wires.
- **useCollectionStore** (`panic-on-rails-collection-v1`) — The hobby: owned boxes (`ownedSets`), loose parts, trains (`ownedTrains`, rolling stock ids from `src/data/rollingStock.ts`), hobby money (`wallet`, US cents) and `mode` (`collection` = build and run what you own, and earn; `free` = unlimited). Purchases are not undoable. Spawn trains through `simulation/controls.ts` (`spawnTrainAtClearestSpot`, `spawnLayoutTrain`), which respect the mode; loading a template switches to free build.
  - What's left to build with is **derived**, never stored: `src/data/collection.ts` computes inventory − `countPlacedPieces(edges)`. Every placed piece shares one `placementId` across its edges, so a turnout counts, selects and deletes as one piece.
  - Money: `src/simulation/economy.ts` is a pure function of step events (traverse → pay per metre; collision → repair bill). `tickSimulation` settles it into the wallet in collection mode.
- **useOnboardingStore** — Tutorial progress.

Non-persisted stores (reset on refresh):
- **useModeStore** — Edit/Simulate mode + sub-modes (select, place, delete, sensor, signal, wire, connect).
- **useSimulationStore** — Train positions, speeds, collision state. Includes `setError()`/`clearError()` for simulation errors.
- **useEditorStore** — Transient UI state (dragging, selection, ghost previews).
- **useEffectsStore** — Visual/audio effects (screen shake, flash).
- **useShopStore** — Whether the hobby shop dialog is open, and on which tab.
- **useHistoryStore** — Undo/redo stacks. Undoable gestures call `record()` *before* mutating; snapshots cover track + logic (not the collection: purchases aren't undoable).

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

`src/data/catalog/` contains brand definitions (`brands/`), part definitions as JSON (`parts/`), connector specs per part type (`connectors/`), and Zod schemas for validation. Supports Kato Unitrack (N), Märklin C-track (H0), Hornby Setrack (OO), Brio and IKEA. `helpers.ts` has `computeConnectors()` factory for all part types. Track creators live in `src/stores/slices/trackCreators/` (standard, switch, crossing, compound, topology); `createPartTrack(part, position, rotation)` is the single pure entry point that dispatches to them. Parts carry a footprint `width` (the catalog file's `trackWidth` unless overridden, e.g. Kato's 69 mm road-crossing rerailer); straights may end in a buffer stop (`bumper: true`).

Complex pieces (curved turnouts, double slips, scissors crossovers) are **topology parts**: named connectors plus routes, each a path of `{straight}` and `{arc, angle, turn}` steps. Two routes at one connector make points; the first route listed is state 0. `data/catalog/topology.ts` resolves them once for both connectors and track creation, and throws when routes that should meet miss by more than 0.5 mm / 0.5°. Prefer a topology part over a new part type. See `src/data/catalog/README.md`.

### Scales

`src/config/scales.ts` holds each scale's model ratio, gauge and `size` relative to N (H0 = 160/87). The game was tuned in N; a bigger scale is N grown by `size`: cars (`trainCars.ts`, `TrainLayer`), speeds, acceleration, braking, curve limits and look-ahead (`driving.ts` functions take `size`), and collision thresholds. A train's `scale` comes from its rolling stock or the track it's put on; collection mode only runs a train on track of its own scale. The track painter draws each brand in its own `ModelLook` (Kato's ballast, Märklin's grey bed and centre studs, Hornby's bare sleepers).

### Boxed Sets & Layout Plans

`src/data/sets/<brand>/*.json` — one file per real boxed set (contents, accessories, `extends`, footprint, plans), validated by `schema.ts` and loaded automatically by `index.ts`. A **layout plan** is a chain of parts: each step attaches a catalog part to a connector of an earlier step (`at`, default: previous piece's through exit) by one of its own connectors (`via`, default: primary; a curve attached `via: "B"` turns left). `resolvePlan()` places the pieces from catalog geometry and reports joints, open ends and the bill of materials; `planToTemplate()` turns a plan into a template recipe for `applyTemplate()` or the headless harness. See `src/data/sets/README.md` to add a set.

### Simulation System

The simulation is a pure function plus thin adapters — keep it that way:

- **`src/simulation/step.ts`** — `stepSimulation(world, dt, ctx) → { world, events }`. Pure: no stores, audio, DOM, `performance.now()` or `Math.random()`. Order per tick: movement → collisions → debris → sensors/wires. Clock and RNG come in via `ctx` (`createRng(seed)` for determinism); side effects go out as typed `SimEvent`s (`traverse`, `bounce`, `collision`, `sensor`, `switch`, `signal`).
- Subsystems it calls:
  - `driving.ts`: the power pack. Speed follows `train.throttle` with momentum, brakes in time for a red signal's stop line or the end of the line (`stopAhead`, `stoppingLimit`), and derails above a curve's limit (`derailSpeed(radius)`). The direction lever (`reverseRequested`) stops the train, then reverses it.
  - `movement.ts`: edge traversal, switch routing and dead-end bounce, with a hard stop at red stop lines as a safety net.
  - `collision.ts`, plus `utils/collisionManager.ts`.
  - `signals.ts`: sensor zones → wire actions.
  - `utils/crashPhysics.ts`: debris. RNG-injected; never mutates input.
  - `economy.ts`: money from events.
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

Two Playwright projects: `chromium` (CI, port 4173, builds first) and `dev` (agentic, port 5173, needs `pnpm dev` running + `PLAYWRIGHT_DEV=1`). Agent specs live in `e2e/specs/` (not run in CI); top-level `e2e/*.spec.ts` run in CI. Every spec fails on a page or console error (`consoleGate` in `e2e/fixtures/app-fixture.ts`; opt out per test with `allowedConsoleErrors`).

**Play like a player.** The canvas is invisible to the DOM and to Playwright MCP snapshots. `window.__PANIC_QA__.look()` (`src/utils/qaLens.ts`) lists pieces, open ends (with drop points), points, trains, hints and dialogs, with page coordinates and whether each is clear of overlays. `e2e/helpers/player.ts` plays with real mouse and keyboard input only and counts actions, misses, recoveries and obstructions. `e2e/specs/playtest.spec.ts` holds that effort to budgets. For model-based fuzzing of building, see `src/stores/__tests__/buildModel.test.ts` (fast-check; failures shrink to the shortest breaking sequence and print a replay seed).
