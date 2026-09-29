# Panic on Rails: State of the Game & Roadmap

> **Living document.** Update the checkboxes and the "Last assessed" line when a phase lands.
> Last assessed: 2026-09-29. Method: two code audits, hands-on play in headless Chromium (real
> drag-and-drop, templates, crashes), headless simulation of every shipped template, and research
> into real starter sets (Kato, Hornby, Märklin).

## TL;DR

**Panic on Rails is a virtual model railway** for people who love model trains but can't buy
the real parts. You open a real starter set, build real layouts with accurately modelled track,
run your trains, and keep expanding the railway with no end point.

- **Engine: done.** Phases 0 and 1 give a headless, deterministic simulation, snapping that
  closes loops, signals that stop trains, switches you can throw mid-run, and train controls.
- **Next:**
  - **The Box (Phase 2):** real boxed sets with their exact contents and the layouts from their
    manuals.
  - **The Hobby (Phase 3):** a collection you grow with virtual money earned by running trains.
  - **The Power Pack (Phase 4):** driving trains realistically.
  - **Looks (Phase 5):** track and trains that look like the models.

The old "missions" plan is replaced by this hobby loop. Operations puzzles (Inglenook,
Timesaver) come back later as optional challenges.

## Vision

A browser **virtual model railway**. The primary audience is modelers without the budget,
space or time for the real thing; a secondary one is modelers planning a real layout before
they buy.

1. **Authentic.**
   - Every track piece is a real product with the manufacturer's number and exact geometry.
   - Every boxed set contains exactly what the real box contains.
   - Layout plans come from the real manuals.
   - If a layout fits in Panic on Rails, it fits on your table. Tests prove every set's plans
     close with the real dimensions.
2. **Running is the reward.**
   - Trains behave like models: a power-pack throttle with momentum, scale speeds and real car
     lengths.
   - They look like models: ballasted roadbed and proper rolling stock.
3. **The hobby is endless.**
   - Start with a starter set.
   - Earn virtual hobby money by operating your railway.
   - Spend it in the virtual hobby shop on expansion sets, turnouts and trains.
   - Real money is never involved, and there is no last level, just a bigger railway.
4. **Panic.**
   - Two trains, one track: a switch left the wrong way ends in a spectacular crash.
   - Crashes cost repairs, and they are always the dispatcher's fault.

A **free-build / planner mode** keeps unlimited parts for designing a real layout. It will
produce a shopping list of the real products used.

See [`docs/design/virtual-model-railway.md`](design/virtual-model-railway.md) for the design,
including the research on real starter sets.

---

## 1. Assessment

### 1.1 What works

- **Building.** Dragging parts from the bin snaps them to open endpoints (verified with real
  HTML5 drag-and-drop). The bin covers the Kato N-scale and Brio/IKEA wooden catalogs,
  including switches and crossings. Undo/redo, save/load (Zod-validated)
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
| 2 | **No goal.** No win/lose, score, levels or progression. Budget can't be earned, and "Reset Budget" is free. Reframed: the goal is the hobby itself (collect sets, build, run), not missions. | No progression code; `BudgetTicker.tsx`, `createTrackSlice.clearLayout` refunds | 2–3 |
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
| 4 | Three graph walkers. Movement respects switches, but the carriage placement (`trainGeometry.ts`) and the trail (`TrainLayer.tsx`) take `connections[0]`, so carriages can render down the wrong branch. | 7 |
| 5 | `GhostLayer.tsx` re-derives part geometry with about 19 inline trig calls instead of using the catalog connectors, so the preview can drift from what gets placed. | 7 |
| 6 | Cross-store coupling. Track reaches into logic and budget (`removeTrack` cascade, `clearLayout` budget reset). About 40 `getState()` calls in components and hooks, and about 40 stray `console.log` calls despite `utils/logger.ts`. | 7 |
| 7 | `e2e/specs/` (11 specs, about 3.8k lines) never runs in CI. They contain about 150 `waitForTimeout` calls, and their only visual baseline is darwin-only. | 7 |
| 8 | No coverage tool or threshold, no dead-code detector (knip), no bundle budget. | 7 |
| 9 | Three scenario formats (TrackTemplate, e2e `TestTemplate`, LayoutData), and none of them encodes expected outcomes. | 2–3 (layout plans become the one recipe format) |

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
- [x] **Toolbar and parts bin fit on laptop screens.** The toolbar stays on one line from
      1280px up, and the bin's second column is no longer clipped.
- [x] **Signals stop trains.** A train heading into a node with a red signal stops a short gap
      before it and resumes on green. A train already past the stop line when the signal
      changes can't stop and runs through. Implemented in `movement.ts`; `step.ts` emits
      `signal-hold`/`signal-release`.
- [x] **Switches clickable in Simulate mode.** The ripple only plays when the switch actually
      toggled.
- [x] **Per-train Stop/Go and Reverse** in the train panel. Spawning picks the spot farthest
      from other trains (`simulation/spawn.ts`), so trains never stack.
- [x] **Toolbar pause stays in Simulate mode.** Loading a template fits it to the view, and `F`
      re-fits at any time. Templates still auto-run for instant gratification.
- [x] **Crash feedback that lands.** Screen shake is wired up, the flash renders above the
      trains, and `ErrorBanner` shows simulation errors.
- [x] **"Switch Showdown" rebuilt** as a real puzzle: a line with a passing loop. Headless
      tests prove both outcomes: a crash without input, and a safe pass after flipping the
      west switch.
- [x] **Onboarding** requires an actual closed loop (a graph cycle). The celebration toast
      shows for its full duration and points the player at signals and switches. "Skip" is
      hidden during the celebration.
- [x] **Fixed while playing:**
      - Left-hand turnout branches rendered mirrored, because Konva got a negative arc sweep.
      - The track bitmap cache used an edge/node *count* key, so loading a template with the
        same counts kept showing the old layout.
- [ ] Crash counter, and wreckage that blocks the track until cleared (moved to Phase 3).
- [ ] Clicking a train on the canvas to stop it (the panel buttons cover this for now).

### Phase 2: The Box, real starter sets

Goal: open a real box, see exactly what's inside, and build the layouts from its manual.

- [x] **Layout plans as part chains** (`src/data/sets/plan.ts`). Each piece attaches to a
      connector of an earlier piece, the way a manual reads. Positions come from catalog
      geometry, never from stored coordinates.
- [x] **Sets as data** (`src/data/sets/<brand>/*.json`, Zod-validated). A set records its
      contents, accessories, the sets it extends, its footprint and its plans.
- [x] **Proof of authenticity** (`src/data/sets/__tests__/sets.test.ts`). For every plan:
  - it closes with no gaps;
  - it uses only parts in the box, plus the sets it extends;
  - a train runs it headlessly without incident.
- [x] **Train sets shelf** (toolbar 📦): box cards with contents, footprint, a plan preview and
      "Build this layout". Building is undoable.
- [x] **First boxes:** Kato M1 Basic Oval (20-852) and V5 Inside Loop (20-864). V5 is a second
      oval 33 mm inside M1, so two trains can run.
- [x] **Buffer stops** (`bumper` straights), plus the Kato feeder (20-041) and rerailer (20-026)
      tracks from the M1 box.
- [x] Crossings and crossovers are now in the parts bin. Bin cards and the drag preview draw
      each part's true shape.
- [x] **Fixed:** turnout branches drew as near-full circles at some rotations, because the arc
      end angle was re-normalized across 0°.
- [x] **The Kato ladder:** M2 (oval and siding), V1 (passing siding), V3 (yard), V4 (#4 siding)
      and V6 (outside loop). Contents and plans are verified against Kato's 2025 catalog and set
      guides. Starter boxes measure what's printed on them, to within 1.5%. M1 is exact.
- [x] **Catalog corrected against Kato's catalog:**
  - bumpers A and B (20-046/047);
  - S60 cut straights, which have no product code of their own;
  - 16 real curves, including the 15° and compact ones;
  - compact turnouts (20-240/241);
  - X15 crossings whose diagonal spans the same 186 mm;
  - roadbed widths;
  - the invented single-track R414, which is removed.
- [x] **Fixed:** the #4 single crossovers' turnouts diverged *away* from each other, a 33 mm jump,
      and only half of each track existed. A new invariant checks that every edge reaches its
      nodes, for every part including compounds.
- [x] **Fixed: joining track at points.**
  - Dropping a turnout onto a track end by its entry deleted the points, and left the
    branch pointing at a node that no longer existed. Joins now move every edge and keep
    the points (`connectionOps/merge.ts`).
  - Unjoined points count as open ends (`isOpenEnd`), so track snaps onto a turnout's entry.
  - Every open end of a dropped piece joins, not only its first edge's.
  - A train reaching points with nothing beyond them stops, instead of U-turning onto the
    other route.
  - A route is dimmed along its whole length, and only when no points send trains along it.
    The points' wedge swings toward the branch's side, and its animation now finishes.
- [ ] V7 (double crossover) needs a WX310 double crossover part. Double-track sets (V11–V15)
      need double-track pieces.
- [ ] More brands' ladders: Hornby Track Packs A–F and Märklin C1–C5 need curved turnouts and a
      double slip (Phase 6).

### Phase 3: The Hobby, collection, virtual money and the shop

Goal: the endless loop. Run trains → earn → buy boxes → build bigger → run more.

- [x] **Collection.** Owned sets and loose parts become an inventory.
  - The parts bin shows what you own, with how many pieces are left.
  - Placing a piece uses one and removing it returns it. This is derived as owned − on the
    table, so undo and delete can never lose a piece.
  - Free-build mode ignores the inventory.
- [x] **Hobby wallet** replaces the fixed budget: $1.50 per metre of model track run, per train,
      and a $20 repair bill per crashed train. The toolbar shows each payment as it lands.
- [x] **Hobby shop:** buy boxed sets and loose parts. Prices are roughly 2025 US street prices.
  - A set's layout can only be built once you own every piece it needs; the shop says what's
    missing.
  - Box-only pieces, such as S60 cut straights, aren't sold loose.
- [x] New players start with a Kato M1 box and $20.
- [x] Headless tests for the economy: earning is a pure function of simulation events.
- [x] **Fixed:** deleting one route of a turnout left half a turnout behind. Every placed piece
      now shares one `placementId`, so it deletes and counts as a whole.
- [x] **Rolling stock in the shop.** Trains are owned like track: you start with one diesel
      passenger train and buy more (commuter, freight, express).
  - In collection mode, Add Train runs a train you own that isn't on the track. When they're
    all running, it opens the shop's Trains tab.
  - Each train's throttle tops out at its top speed.
  - Templates load in free build: they're demo layouts, not your collection, so they earn
    nothing.
  - The trains are generic models, flagged as such, until real train sets are verified.
- [ ] More ways to earn: station stops, on-time runs, operating sessions.
- [ ] **Shopping list:** a bill of materials for the current layout, with real product numbers,
      for planners.

### Phase 4: The Power Pack, driving

- [x] **Throttle with momentum** (`simulation/driving.ts`):
  - each train has a throttle it accelerates (80 mm/s²) or brakes (160 mm/s²) toward;
  - it brakes in time to stand at a red signal's stop line, and eases into buffer stops before
    heading back;
  - a per-train throttle slider shows scale speed (100 mm/s = 58 km/h at N scale);
  - Stop is an emergency stop, and Go pulls away from a standstill;
  - the direction lever brakes to a stand before reversing.
- [x] **Curves have speed limits, and derailments are the panic.**
  - Comfortable speed is √(103 mm/s² × radius): about 180 mm/s on R315, 150 on R216 and 272
    on a #6 turnout's R718 route.
  - At 1.25× that, the train derails. That throws debris, logs a `derail` event and bills a
    $20 repair.
- [x] Rolling stock as data (`src/data/rollingStock.ts`): livery, cars, top speed and price,
      bought in the shop.
- [ ] Real train sets (Kato and other brands) with product numbers, and car lengths per model.
- [ ] Optional operations challenges on real puzzle layouts (Inglenook sidings, Timesaver).

### Phase 5: Looks

Performance assessment (2026-09-30, production build on an M5 MacBook Pro with GPU Chrome, plus a
software-rendering run):

- **Detailed graphics are affordable,** at an estimated 2–6 ms per frame for a 1000-piece
  layout with 320 cars, once they are drawn the right way.
- **Today's plain graphics are slow for fixable reasons:**
  - Blurred drop shadows on every car and turnout marker: 2.5 fps with 40 trains on a
    300-piece layout, versus 120 fps without them.
  - The canvas re-renders every tick, and the train layer only redraws every other frame.
  - The whole-layout track bitmap goes over Chrome's size limit on big layouts, where the
    track then disappears.

Order, biggest win per millisecond first:

- [x] **Blurred shadows removed** from trains, turnout controls, signals and sensors.
- [x] **No per-tick re-renders:**
  - no whole-store subscriptions on the canvas path;
  - trains redraw straight from the store in the same frame as the simulation step.
- [x] **Model trains:**
  - a diesel locomotive and coaches as pre-drawn sprites with baked shadows;
  - each car placed by two bogies, so it cuts across curves;
  - cars follow the route the train came through (`train.trail`), not `connections[0]`;
  - 44 mm cars at game scale (`config/rollingStock.ts`).
- [x] **Model track:**
  - ballasted roadbed, sleepers and two-tone rails, painted by one shape with zoom-based
    detail;
  - road-crossing plates and wooden-track grooves;
  - the route a turnout is set against drawn dimmer;
  - sleepers on curves are now square to the track;
  - joint dots only in Edit mode.
- [x] **The whole-layout bitmap cache is gone.** Painting is cheap enough uncached, so big
      layouts no longer vanish and pans no longer stutter.

  Measured on the production build with GPU Chrome on an M5, before → after:

  | Scenario | Before | After |
  |---|---|---|
  | 300 pieces, 40 trains × 8 cars, zoomed out | 2.5 fps | 120 fps (1.8 ms main thread) |
  | 1000 pieces, panning while editing | 6.4 fps | 120 fps |

  With software rendering (no GPU): 105 fps and 55 fps.
- [ ] Turnout points and frog detail; a tile cache only if layouts outgrow direct painting.
- [x] **Consist model:** turning back (the direction lever, or a buffer stop) moves no car.
  - The far end of the train becomes its front, and the locomotive pushes from the back until
    the next reversal (`reverseConsist`, `train.locoLeading`).
  - Cars used to jump to the other side of the locomotive.
- [ ] Collision using each car's real extent, not points along the train.
- [x] **Decided: stay on Konva.** A WebGL renderer (PixiJS) runs at 0.3 ms per frame on a GPU but
      92 ms with software rendering. Reconsider only for lighting or particles.
- [ ] Recorded or sampled audio: motor hum by speed, joiner clicks, horn, switch clack and crash.
- [ ] Crash slow-motion, near-miss detection, and wreckage that blocks the track until cleared.

### Phase 6: More systems and complex parts

- [ ] A general part topology (connectors, segments and routes) that replaces the per-type track
      creators. It enables double slips, curved turnouts, 3-way turnouts and scissors
      crossovers.
- [ ] Brands: Märklin C-track (start sets plus C1–C5), Hornby Setrack (Track Packs A–F), Tomix
      Fine Track, Bachmann E-Z Track.
- [ ] Elevation: viaducts and bridges (Kato V2/V12/V13), with grades affecting speed.
- [ ] Share a layout by URL.

### Phase 7: Long-term maintainability (continuous; pick items alongside feature work)

- [x] Cars follow the route their train took (`utils/trainCars.ts` plus `train.trail`, with a
      switch-aware fallback), so they never render down the wrong branch. The motion-trail
      effect is gone. Movement keeps its own walker; merge the two if a third use appears.
- [x] GhostLayer computes previews through the catalog connector code and track creators
      (`createPartTrack`); crossovers and bumpers now preview their true shape.
- [ ] Move cross-store cascades into an orchestration layer. Replace `console.log` with
      `logger` and add a `no-console` lint rule.
- [ ] `@vitest/coverage-v8` with thresholds on `src/simulation/**` and `src/stores/**`.
- [ ] knip in CI. Delete the remaining dead code (`useSimulateModeHandler` or wire it up,
      `isHeadOnCollision`, `cleanupOldParts`).
- [ ] Run `e2e/specs/` nightly against preview. Replace `waitForTimeout` with
      `expect.poll`/`__PANIC_SIM__`. Add Linux baselines.
- [ ] Type the debug bridge against the real store types (no `unknown`/`any`). Add logic
      mutators (sensors, signals, wires).
