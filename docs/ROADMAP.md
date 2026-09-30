# Panic on Rails: State of the Game & Roadmap

> **Living document.** Update the checkboxes and the "Last assessed" line when a phase lands.
> Last assessed: 2026-09-29. Method: two code audits, hands-on play in headless Chromium (real
> drag-and-drop, templates, crashes), headless simulation of every shipped template, and research
> into real starter sets (Kato, Hornby, Märklin).

## TL;DR

**Panic on Rails is a virtual model railway** for people who love model trains but can't buy
the real parts. You open a real starter set, build real layouts with accurately modelled track,
run your trains, and keep expanding the railway with no end point.

- **Done:**
  - **The engine (Phases 0–1):** a headless, deterministic simulation. Snapping closes loops,
    signals stop trains, switches can be thrown mid-run, and trains have controls. Wrecks
    block the line until they're re-railed.
  - **The Box (Phase 2):** real boxed sets with their exact contents and the layouts from their
    manuals, proved to close. That's Kato Unitrack M1–V7, Märklin C-track (start oval, C1–C5)
    and Hornby Setrack (train-set oval, Track Packs A–F).
  - **The Hobby (Phase 3):** a collection grown with hobby money earned by running trains and
    from passengers' fares at stations, a shop for boxes, loose parts and trains, and a
    shopping list for planners.
  - **The Power Pack (Phase 4):** throttle with momentum, curve limits and derailments.
  - **Looks (Phase 5):** track painted like the real product and sprite trains, at 120 fps on a
    big layout. Trains collide by their cars' real extent.
  - **Complex parts (Phase 6):** the general part model. It covers scissors crossovers, curved
    turnouts and double slips, with trains sized and driven to scale in N, H0 and OO.
  - **QA (Phase 7):** playtests that play with real input and hold effort to budgets,
    model-based fuzzing of building, a console-error gate and coverage floors.
- **Next:**
  - on-time runs, to timetables;
  - real train sets with product numbers;
  - elevation;
  - Kato's double-track sets.

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
- [x] **Wreckage blocks the line** until the player clears it, and the train panel counts
      wrecks.
  - A crashed train stays where it came to rest. A train that runs into it crashes too, and
    pays its own repair bill.
  - Re-rail puts a wreck back on track of its own scale, standing, at the clearest spot where
    all its cars fit. × takes it off the track instead. Either way its debris is swept up.
    Play no longer clears wrecks.
  - The panel keeps the dispatcher's record: trains wrecked this session, and railway time
    since the last wreck.
  - The train panel has a fixed width, so the canvas no longer shifts as trains come, go
    and crash.
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
- [x] **V7 double crossover** (20-866): the WX310 scissors crossover (20-210), built with the
      general part topology (Phase 6). Its plans lay it into M1 with V5's inner oval, or V6's
      outer one.
- [ ] Double-track sets (V11–V15) need double-track pieces.
- [x] **Märklin C-track (H0):** the start oval (S1) and extension sets C1–C5, with every plan
      from Märklin's 2023 track-plan booklet. They include curved turnouts (24671/24672) and the
      24624 double slip with one drive per end. Every plan closes exactly, except S2's passing
      loop, which is 0.15 mm long on paper.
- [x] **Hornby Setrack (OO):** the 3rd radius train-set oval and Track Extension Packs A–F,
      ending in the whole TrakMat plan: two loops, a crossover, a double level crossing and
      five sidings.
  - Every dead end is within a millimetre of where it sits in Hornby's pack diagrams, as read
    off them.
  - The level crossing's 67mm against the loops' 66.68mm leaves 0.4mm.
  - Known approximations:
    - The R083 buffer stop clips onto a track in reality, but has 44mm of track of its own
      here.
    - Pack E's eighth piece, an R606, comes from its diagram, since Hornby's list names seven.
    - The curved points' route shapes are XTrackCAD's.

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
- [x] **Station stops.** The Station tool (7) puts a platform on the track. Its length is five
      cars for the scale, or the piece's length if that's shorter.
  - A passenger train brakes for the platform's far end, stands for six seconds, and its
    passengers pay for their ride. The rate is per metre since its last stop, per coach, up
    to 3 m (`config/stations.ts`). Freight trains pass through.
  - The train panel shows a train at a platform ("At Station 1"), the sim log records each
    call and its fare, and the QA lens lists the stations.
  - Laptop toolbars got narrower buttons to make room for the tool. The one-line check now
    covers the width just past each breakpoint, not only 1280.
- [x] **Operating sessions.** Start one from the train panel: ten railway minutes, tallied
      as it runs (takings, station calls, wrecks).
  - A full session without a wreck pays a 25% bonus on what it took, into the wallet in
    collection mode.
  - A wreck or ending early forfeits the bonus.
  - The tally is a pure function of step events (`simulation/session.ts`), kept by
    `tickSimulation`.
- [ ] On-time runs: timetables at stations, and a bonus for keeping to them.
- [x] **Shopping list:** the layout on the table as real products, for planners.
  - It gives product numbers, quantities and prices, and in collection mode what's owned and
    what's left to buy.
  - Pieces not sold on their own name the boxes they come in.
  - It copies as text and downloads as CSV.
- [x] The loose parts shop sells every track system's pieces, not only N scale's.

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
- [x] **Collision by each car's real extent:** each car is a rectangle at the pose it's drawn at,
      tested with the separating-axis test after a grid broad phase.
  - Trains meeting on a crossing's diamond now crash. Before, they passed through each
    other, because collisions were only checked on one edge or at a shared node. That
    affected every crossing: the 90° and 15° crossings, the WX310's diagonals and the
    double slip.
  - It costs about 0.5 ms per tick for 40 trains of 8 cars (headless).
- [x] **Decided: stay on Konva.** A WebGL renderer (PixiJS) runs at 0.3 ms per frame on a GPU but
      92 ms with software rendering. Reconsider only for lighting or particles.
- [ ] Recorded or sampled audio: motor hum by speed, joiner clicks, horn, switch clack and crash.
- [ ] Crash slow-motion and near-miss detection.

### Phase 6: More systems and complex parts

- [x] **General part topology** (`type: "topology"`): a part is its connectors and the routes
      between them, as paths of straights and arcs. Two routes at one connector make points.
  - One resolver (`data/catalog/topology.ts`) feeds both the connector model and the track
    creator, and rejects routes that should meet but don't.
  - It builds scissors crossovers (Kato WX310), curved turnouts and double slips.
  - **Linked points:** one control throws several sets, like the WX310's single control for
    all four (`switchGroup` on the nodes).
  - Still open: 3-way turnouts need three-position points. The older parts keep their
    per-type creators; move them over only if one needs a change.
- [x] **Scales:** H0 and OO beside N (`config/scales.ts`). Trains, speeds and braking grow with
      the model scale, so an H0 train drives like an N one, and track shows its brand's look.
- [x] Brands: Märklin C-track (start oval plus C1–C5), Hornby Setrack (oval plus Track Packs
      A–F).
- [ ] Brands: Tomix Fine Track, Bachmann E-Z Track.
- [ ] Rolling stock per scale beyond the generic H0 and OO trains.
- [ ] Elevation: viaducts and bridges (Kato V2/V12/V13), with grades affecting speed.
- [x] **Share a layout by URL.** Share copies a link with the track in its fragment
      (`#layout=v1.…`): each piece's part, position to 0.01 mm and rotation, compressed.
  - The graph doesn't keep where a piece was placed, so each piece is rebuilt at the origin
    and its first edge matched to find its turn and shift.
  - A 55-piece layout (Hornby Pack F) makes a link of about 650 characters.
  - Opening a link builds the layout exactly as it was shared, in free build and undoably.
    It asks first if something is on the table. It works on load and when a link is pasted
    into an open tab. Trains and wiring aren't included.

### Phase 7: Long-term maintainability (continuous; pick items alongside feature work)

- [x] Cars follow the route their train took (`utils/trainCars.ts` plus `train.trail`, with a
      switch-aware fallback), so they never render down the wrong branch. The motion-trail
      effect is gone. Movement keeps its own walker; merge the two if a third use appears.
- [x] GhostLayer computes previews through the catalog connector code and track creators
      (`createPartTrack`); crossovers and bumpers now preview their true shape.
- [ ] Move cross-store cascades into an orchestration layer.
- [x] **Logging goes through `logger`**, which hides debug and info in production. A
      `no-console` lint rule allows only `warn` and `error` in app code. The app's `console.log`
      calls became logger calls, and the clear-layout trace shrank from four lines to one. Only
      the startup banner and `window.debugExport()` still print directly, on purpose.
- [x] `@vitest/coverage-v8` with floors per area (simulation, stores, data, utils) a little
      under today's numbers. CI runs `pnpm test:coverage`.
- [x] **knip in CI** (`pnpm knip`) for unused files and dependencies. It deleted
      `useSimulateModeHandler`, `useViewport`, two e2e helpers nothing used, and eight barrel
      `index.ts` files nothing imported. (`isHeadOnCollision` had gone already.)
- [ ] knip's unused exports (119): mostly store selectors and barrel re-exports. Decide which
      are API worth keeping, delete the rest, then add exports to the CI check.
- [ ] Run `e2e/specs/` nightly against preview. Replace `waitForTimeout` with
      `expect.poll`/`__PANIC_SIM__`. Add Linux baselines, generated in the pinned Playwright
      Docker image with the headless mode pinned (GPU rasterization changes pixels).
- [x] **The debug bridge is typed from the stores.** Each store section is `expose(store,
      stateKeys, actionKeys)`, so its types come from the store itself and can't drift, with no
      `unknown` or `any` casts.
  - The e2e helpers' snapshot types are derived from the bridge too.
  - Logic mutators added: remove sensors, signals and wires. The simulation section exposes the
    wreck record and the operating session.

#### QA: play like a player (research: `docs/research/20260930_Agent QA and Testing Tools.md`)

- [x] `window.__PANIC_QA__.look()`: what's on the canvas and where on the page, for tests and
      agents. A mouse-and-keyboard `Player`, and playtests with effort budgets: the oval by
      hand, open M1, save up for V4, every set of points in V7/C5/Pack F, and a seeded monkey.
- [x] `track-configs` asserts every configuration, in simulated time.
- [x] Fixed what the playtests found, and lowered their budgets to zero:
  - The view follows a hand build: after a drop it pans (never zooms) to keep the new piece's
    open ends in view. The M1 oval by hand went from 7 zoom-outs to none.
  - Hints and toasts let clicks and dropped track through to the layout; only their buttons
    catch the pointer. Skip tutorial moved from the bottom of the canvas into each hint.
  - A curve dropped straight ahead of a curved track's end keeps turning the same way, rather
    than whichever way the snap's rotation tie-break chose.
  - A set of points keeps a button at least 12 px across however far out the view is zoomed.
- [x] Playwright 1.63. The test agents have the `browser_mouse_*_xy` tools and are told to see
      the canvas with `look()`. The seed test waits for the lens.
- [ ] Try `playwright-cli` for agent sessions.
- [x] A console/page-error gate in the app fixture: every spec fails on a new error.
- [x] fast-check model-based tests of building: random drops at open ends, deletes, undo, redo
      and points, against the real stores, snap manager and join. The graph must stay
      consistent after every step.
  - Its first runs found a bug: deleting a turnout whose points had moved onto a track end
    left that end claiming two missing routes. Fixed.
  - With #137's join bug put back, it fails in two runs and shrinks the case to two drops.
- [x] **fast-check geometry properties** (`geometryProperties.test.ts`):
  - `normalizeAngle` lands in [0, 360), a whole number of turns from its input, and is
    idempotent.
  - Any catalog piece attached to any connector of any piece, by any of its own connectors,
    meets it within 0.01 mm, face to face.
  - Every boxed set's layout, built anywhere on the table at any angle, joins up exactly as at
    the origin: same edges, nodes, open ends and points.
  - The first run found that `normalizeAngle` wasn't idempotent. Re-normalizing an angle in
    range could move it one unit in the last place, and 359.99999999999994 became 0. Fixed.
- [ ] Port the monkey playtest to `fc.commands`.
- [x] **Play metrics in Vitest** (`playMetrics.test.ts`; `PLAY_METRICS=1` prints them). The
      numbers are budgets:
  - Pacing: the starter train on the M1 oval earns $8–10 a minute just running. One station
    adds 10–50%, and a station on every straight earns less than one. Each V-set takes under 12
    minutes to save up for, and the dearest over 4.
  - Every boxed set's plan runs 5 minutes at the default throttle without incident.
  - Flat out on M1, the starter diesel and the commuter hold the R315 curves and the express
    doesn't. Driven heavy-handed (a random throttle every 5 s), the starter diesel never
    derails on a Kato layout; a free-build train at full power derails about 15 times per
    train-hour.
- [x] **Accessibility** (`e2e/accessibility.spec.ts`): axe against WCAG 2.2 A/AA on every
      screen, aria snapshots of the edit tools and the share dialog, and a real crash with and
      without reduced motion. The first scan found, and this fixed:
  - text below AA contrast: the parts bin's headings (2.4:1) and product numbers (1.9:1), the
    shop's Buy buttons (3.3:1), the train panel's carriage count and the wreck banner;
  - scrolling lists the keyboard couldn't reach (the parts bin, the shop, the shopping list);
  - edit tools named by their whole tooltip, with no pressed state.
  - A crash no longer shakes the view for players who ask for reduced motion, and the effects
    store starts at most three flashes a second (WCAG 2.3.1), however many trains pile up.
- [ ] A nightly frame-time budget: milliseconds per environment, not FPS; warn-only at first.
- [ ] Vitest browser mode, narrowly, for the track painter and car sprites.
- [ ] Agent playtest charters: persona, setup, budget, oracles, evidence. Each finding becomes a
      failing `Player` test before it's filed.
- [ ] Trial: Stryker on geometry and simulation, nightly.
