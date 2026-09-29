# Panic on Rails: State of the Game & Roadmap

> **Living document.** Update the checkboxes and the "Last assessed" line when a phase lands.
> Last assessed: 2026-09-29 (after `c6fa535`). Method: two code audits, hands-on play in headless
> Chromium (real drag-and-drop, templates, crashes), and headless simulation of every shipped template.

## TL;DR

The **engineering base is solid**: strict TypeScript, 740+ tests, CI-gated deploy, an accurate
Kato/Brio catalog, real snapping, undo/redo, and a graph-based simulation. It is **not yet a game**,
for three reasons:

- There is no objective.
- The player can't influence a running simulation: signals are decorative, switches can't be
  clicked mid-run, and trains have no controls.
- Until Phase 0, the loop silently froze on the first crash, which is the one "fun" moment it
  has.

The plan has three steps:

1. Make the simulation headless and trustworthy (**Phase 0, done**).
2. Make the controls real (**Phase 1**).
3. Add a mission layer with objectives, stakes and progression (**Phase 2**). Every mission is
   proved solvable by a headless test.

## Vision

A browser-based **digital toy** for building model railways and watching them run, with
emphasis on:

- **Build**: accurate track pieces that snap together satisfyingly.
- **Simulate**: trains follow the real track graph through switches.
- **Panic**: things go wrong spectacularly, and the player is the dispatcher who prevents it.

Fun comes first and realism second. It should feel instantly playable and be good to watch.

---

## 1. Assessment

### 1.1 What works

- **Building.** Dragging parts from the bin snaps them to open endpoints (verified with real
  HTML5 drag-and-drop). The bin covers the Kato N-scale and Brio/IKEA wooden catalogs,
  including switches and crossings. Parts cost budget. Undo/redo, save/load (Zod-validated)
  and localStorage persistence all work.
- **Simulation.** Trains traverse loops, figure-8s and switches, and bounce at dead ends. The
  sensor→switch wire automation works. Collisions produce debris.
- **Templates.** Simple Oval, Wooden Starter and Crossover Express all run for 60 s cleanly
  (headless scenario tests).
- **Tooling.** Strict TS, ESLint with 0 warnings, Vitest, Playwright (CI plus an agentic dev
  project), a debug bridge, Dependabot, and deploys gated on CI.

### 1.2 Playability gaps (ranked)

| # | Gap | Evidence | Phase |
|---|-----|----------|-------|
| 1 | **The simulation froze on the first crash.** Immer deep-freezes store state; `updateCrashedParts` mutated it, the loop threw, and `setError` paused. Because `ErrorBanner` is never rendered, it happened silently. | `utils/crashPhysics.ts` (fixed); `e2e/simulation-harness.spec.ts` fails without the fix | 0 ✅ |
| 1b | **You couldn't build a loop by hand.** Every curve (Kato and wooden) was defined so its body extended *behind* its start connector: snapped onto a track end, it folded back over the track. Snapping also required the ghost to already face within 15° of the target, so curve-to-curve joints never snapped (rotate-during-drag with `R` can't work because native drag-and-drop swallows key events). | `connectors/curve.ts`, `createCurveTrack`, `findBestSnap` (fixed); `e2e/building.spec.ts` | 1 ✅ |
| 2 | **No goal.** No win/lose, score, levels or progression. Budget can't be earned, and "Reset Budget" is free. | No mission code; `BudgetTicker.tsx`, `createTrackSlice.clearLayout` refunds | 2 |
| 3 | **Signals don't stop trains.** Red and green are cosmetic, so the whole logic toolset has no teeth. | `simulation/movement.ts` never reads signals | 1 |
| 4 | **Switches can't be clicked while trains run.** The ripple plays but the switch doesn't toggle. Only hidden keys (S on hover, 1–9) work. | `useNodeInteraction.ts` returns early unless editing | 1 |
| 5 | **No per-train control.** Every train runs at a fixed 100 px/s with no stop or reverse. FEATURES.md claims "Reverse trains on demand". | `trainSlice.spawnTrain`, `TrainPanel.tsx` | 1 |
| 6 | **Spawning stacks trains.** The toolbar's Add Train always uses the first edge at distance 0, so two presses collide instantly. | `SimulateToolbar.tsx` | 1 |
| 7 | **"Switch Showdown" is unwinnable.** It is 4 straights with no switch, a guaranteed crash, and copy that says "Can you stop them in time?". | `public/templates/switch-showdown.json`, `scenarios.test.ts` | 1 |
| 8 | **Crashes have no stakes or weight.** Screen shake is written but never rendered, the flash draws under the tracks, live trains pass through wrecks, and there's no crash counter. | `useEffectsStore.screenShake` has no reader; `StageWrapper.tsx` layer order | 1 / 3 |
| 9 | **Mode flow is confusing.** Pausing from the toolbar exits to Edit mode, which hides the trains. Loading a template teleports you into Simulate with the layout partly off-screen, because there's no fit-to-view. | `SimulateToolbar.tsx`; the template load path | 1 |
| 10 | **Onboarding is shallow.** "Loop created" means ≥4 edges, "You did it!" fires for loading a template, and the "Skip tutorial" button stays visible after completion. It unlocks signals and wires, which don't do anything yet. | `OnboardingProvider.tsx` | 1 |
| 11 | **The parts bin clips its second column** at 1440×900. | Screenshot, first load | 1 |
| 12 | **Little juice.** Only synthesized beeps, with no engine, ambience or music. Near-miss audio exists but is never triggered. | `utils/audioManager.ts` | 3 |

### 1.3 Maintainability & agent-DX gaps

| # | Gap | Phase |
|---|-----|-------|
| 1 | Simulation logic lived inside a React rAF closure. It couldn't run headlessly, was nondeterministic (`Math.random`, `performance.now` in subsystems), and had 0 direct tests. | 0 ✅ |
| 2 | Instruction sprawl: `AGENT.md` (stale versions, Antigravity-era rules), `.agent/workflows` ("STOP for approval"), `.context/`, CLAUDE.md drift. There was no stated read order. | 0 ✅ |
| 3 | Dead code: `utils/facadeConnection.ts` (0 importers, duplicate `validateConnection`) ✅; `useSimulateModeHandler`, `ErrorBanner` (unrendered), `isHeadOnCollision`, `cleanupOldParts`, `playNearMissSound`. | 0 / 1 |
| 4 | Three graph walkers. Movement respects switches, but the carriage placement (`trainGeometry.ts`) and the trail (`TrainLayer.tsx`) take `connections[0]`, so carriages can render down the wrong branch. | 4 |
| 5 | `GhostLayer.tsx` re-derives part geometry with about 19 inline trig calls instead of using the catalog connectors, so the preview can drift from what gets placed. | 4 |
| 6 | Cross-store coupling. Track reaches into logic and budget (`removeTrack` cascade, `clearLayout` budget reset). About 40 `getState()` calls in components and hooks, and about 40 stray `console.log` calls despite `utils/logger.ts`. | 4 |
| 7 | `e2e/specs/` (11 specs, about 3.8k lines) never runs in CI. They contain about 150 `waitForTimeout` calls, and their only visual baseline is darwin-only. | 4 |
| 8 | No coverage tool or threshold, no dead-code detector (knip), no bundle budget. | 4 |
| 9 | Three scenario formats (TrackTemplate, e2e `TestTemplate`, LayoutData), and none of them encodes expected outcomes. | 2 (missions unify this) |

---

## 2. Plan

Each phase ships as one or more PRs that keep CI green. **Definition of done** for every item:
lint, typecheck and unit tests pass; simulation behavior has a headless test; UI behavior has a
CI E2E spec (top-level `e2e/`); docs are updated if a convention changed.

### Phase 0: Headless, deterministic simulation core ✅

- [x] `src/simulation/step.ts`: a pure `stepSimulation(world, dt, ctx) → { world, events }`,
      with clock and RNG injected and typed events.
- [x] `src/simulation/tick.ts`: store binding, seedable RNG (`seedSimulation`), and a
      fixed-step `runSimulation`.
- [x] `useGameLoop` reduced to a rAF driver plus `browserEffectsSink`.
- [x] `src/simulation/harness.ts` and `window.__PANIC_SIM__`: load a recipe, seed, run,
      summarize.
- [x] Direct tests for movement, step, sensors→switches and determinism. Headless scenario
      tests cover all 4 shipped templates.
- [x] **Fixed:** the crash-freeze bug (immutable debris physics), with a browser regression
      test.
- [x] Docs consolidated: CLAUDE.md is canonical with a read order, `AGENTS.md` points to it,
      stale agent docs are removed, and the skill is updated to be headless-first.
- [x] Deleted dead `facadeConnection.ts`.

### Phase 1: Make the controls real

Goal: a player can build by hand, and in every template can prevent a crash by acting.

- [x] **Curves extend forward.** The connector model, the track creator and the ghost preview
      now agree. Templates were converted by rotating each curve 180°, which gives an
      identical body.
- [x] **Auto-align snapping.** A part hovered near an endpoint rotates to mate. The turn
      direction follows the side of the endpoint you hover. Hand-built loops close
      (`e2e/building.spec.ts`).
- [x] **Catalog geometry invariants** for every part: connector model = created nodes, created
      geometry = `deriveWorldGeometry`, and the body extends forward. These found and fixed:
      - swapped arc-direction labels on all switch branches, which distorted a turnout's branch
        when it was moved;
      - the #2 Wye being built as a plain left turnout.
- [ ] Toolbar wraps onto two lines at 1280px width.
- [ ] **Signals stop trains.** A train approaching a node with a red signal decelerates and holds
      before the node, then resumes on green. Implemented in `movement.ts`/`step.ts` and emits
      `signal-hold`/`signal-release` events.
- [ ] **Switches clickable in Simulate mode.** Only animate when a toggle actually happened.
- [ ] **Per-train controls.** Stop/go and reverse per train, from the panel and by clicking a
      train. Spawn picks a free edge, away from other trains.
- [ ] **Toolbar pause stays in Simulate mode.** Loading a template fits the view and does not
      auto-run.
- [ ] **Crash feedback that lands.** Wire up screen shake. Render the flash above the trains.
      Show `ErrorBanner` and a crash counter.
- [ ] **Rebuild "Switch Showdown"** as a real puzzle: a switch plus a siding, where a crash is
      avoidable by flipping it. The headless test proves both outcomes: the crash without
      input, and no crash with the flip.
- [ ] **Onboarding.** Detect an actual closed loop (a graph cycle), celebrate only real
      milestones, and hide "Skip" when complete.
- [ ] **Parts bin layout.** No clipped column.

### Phase 2: The game layer (missions)

A **Mission** is a data file with these parts:

- `recipe`: a starting layout. It may be partial or locked.
- `budget` and `allowedParts`.
- `trains`: spawns and schedules.
- `objectives`: e.g. *deliver N trains to station X*, *survive T seconds*, *no crashes*, *under
  $Y*.
- `failConditions`.
- `stars`: thresholds.

Missions run on the Phase 0 step core, so objectives are pure functions of `(world, events)`.

- [ ] A mission schema (Zod) that replaces the three scenario formats. Templates become
      missions with no objectives.
- [ ] Stations/destinations as a track feature, plus train routing goals.
- [ ] An objective evaluator (pure, over the step events), a mission HUD, win/lose screens and
      star rating.
- [ ] A mission select screen and progression that unlocks parts and missions. Budget becomes
      earned, and the free "Reset Budget" is removed from mission play (sandbox keeps it).
- [ ] **Every mission ships with a `solution` recipe** and a headless test proving it is
      solvable and that the unsolved state fails. This makes level design agent-safe.
- [ ] 8–12 hand-made missions: a learning curve over switches, then signals, then sensors, then
      combos.

### Phase 3: Feel

- [ ] Recorded or sampled audio (engine loop, horn, switch clack, crash) with a volume mixer.
- [ ] Crash slow-mo and camera punch-in. Near-miss detection and audio. Wreckage blocks the
      track until cleared.
- [ ] Train speed ramps (acceleration and braking) instead of instant speed.
- [ ] Share: a URL-encoded layout or mission, plus a replay GIF/clip of the crash.

### Phase 4: Long-term maintainability (continuous; pick items alongside feature work)

- [ ] One switch-aware graph walker used by movement, carriages and the trail. This fixes the
      wrong-branch carriage rendering.
- [ ] GhostLayer computes previews through the catalog connector code and track creators.
- [ ] Move cross-store cascades into an orchestration layer. Replace `console.log` with
      `logger` and add a `no-console` lint rule.
- [ ] `@vitest/coverage-v8` with thresholds on `src/simulation/**` and `src/stores/**`.
- [ ] knip in CI. Delete the remaining dead code (`useSimulateModeHandler` or wire it up,
      `isHeadOnCollision`, `cleanupOldParts`).
- [ ] Run `e2e/specs/` nightly against preview. Replace `waitForTimeout` with
      `expect.poll`/`__PANIC_SIM__`. Add Linux baselines.
- [ ] Type the debug bridge against the real store types (no `unknown`/`any`). Add logic
      mutators (sensors, signals, wires).
