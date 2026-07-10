---
name: high-fidelity-frontend-testing
description: >-
  High-fidelity frontend testing and visual debugging for the panic-on-rails
  train-track planner/simulator (React 19 + React-Konva + Zustand). Use whenever
  writing or debugging Playwright/E2E tests, verifying UI changes visually,
  capturing screenshots, doing visual regression, testing the
  requestAnimationFrame simulation deterministically, or using the debug bridge,
  store bridge, Playwright MCP, or Playwright Test Agents. Trigger on: e2e test,
  Playwright, visual test, screenshot, visual regression, snapshot, simulation
  test, deterministic test, Clock API, flaky test, debug bridge, store bridge,
  agentic testing, headless browser test, "smoke test", "verify in a browser",
  "check the canvas", consistency check.
---

# High-Fidelity Frontend Testing — panic-on-rails

This project is a canvas-heavy app: the entire track/train surface is a single
Konva `<canvas>`, opaque to the DOM and the accessibility tree. "High fidelity"
testing here means **observing real state, not pixels guessed from a snapshot**,
and **controlling time** so the rAF simulation is reproducible.

Three pillars, all validated and working in this repo:

1. **Debug bridge** — read/write every Zustand store + the Konva stage from tests.
2. **Clock API** — drive the `requestAnimationFrame` game loop deterministically.
3. **Visual regression** — `toHaveScreenshot()` on the (stable) canvas.

## Toolchain

Node **24 LTS** + pnpm **11** (pinned via `packageManager` + `engines` in
`package.json`, and `.nvmrc`). Run `nvm use` in the repo. Playwright version tracks `package.json` (Dependabot keeps it current).
**All tests run headless** (`headless: true` in `playwright.config.ts`) — never
pass `--headed` in CI or agentic loops.

## Commands

```bash
pnpm test --run                  # Vitest unit tests (706+ tests, ~1s)
pnpm e2e                         # CI E2E: builds prod + runs `chromium` project
pnpm e2e:dev                     # Agentic E2E: PLAYWRIGHT_DEV=1, `dev` project
pnpm e2e:report                  # Open the last HTML report
# Single spec (dev project — needs `pnpm dev` running first):
PLAYWRIGHT_DEV=1 pnpm exec playwright test --project=dev <name>
```

## The two Playwright projects (`playwright.config.ts`)

| Project    | Port | Runs                         | When to use |
|------------|------|------------------------------|-------------|
| `chromium` | 4173 | `e2e/*.spec.ts` (NOT `specs/`)| **CI gate.** Builds the prod bundle + previews it. Tests here verify the *shipped* app. |
| `dev`      | 5173 | `e2e/specs/*.spec.ts` only    | Agentic / mid-development. Needs `pnpm dev` already running. Rich, slow, screenshot-heavy. |

**Rule:** a test that must gate the PR goes at `e2e/` root. A test that needs
the live dev server, the Clock API, or heavy screenshotting goes in `e2e/specs/`.

## The debug bridge — observe & drive real state

`src/utils/debugBridge.ts` exposes every store on `window.__PANIC_STORES__` and
the Konva stage on `window.__PANIC_STAGE__`. It activates when:
`import.meta.env.DEV` (dev server) **OR** `?e2e` query param **OR**
`localStorage.panic-e2e === 'true'`.

> The `app`/`stores` fixtures navigate to `/?e2e` so the bridge works against
> the **production build** in CI — this is why `chromium`-project tests can
> read stores at all. Keep the `?e2e` param if you add new navigation.

Test helpers in `e2e/helpers/` wrap the bridge:

- **`StoreBridge`** — typed store access: `addTrack`, `getTrackState`,
  `getEdgeCount`, `enterSimulateMode`, `spawnTrain`, `setRunning`,
  `setSpeedMultiplier`, `getSimulationState`, `waitForEdgeCount`,
  `waitForTrainCount`, `getFullState`, …
- **`AgentActions`** — semantic API: `placeTrack`, `buildStraightRun`,
  `switchMode`, `selectEditTool`, `clickCanvas`, `verify`.
- **`ConsistencyChecker`** — asserts rendered Konva shapes match store data.
- **`ScreenshotManager`** — paired `.png` + `.state.json` capture.

Use `e2e/fixtures/app-fixture.ts` (`{ app, stores, snap }`) for new tests.

## Deterministic simulation testing (Clock API)

The simulation (`src/hooks/useGameLoop.ts`) runs on `requestAnimationFrame` with
delta-time from the rAF `timestamp`. **Never test it with `waitForTimeout()`** —
that is wall-clock dependent and flaky. Use `page.clock` instead: it fakes
`requestAnimationFrame` + `performance.now()`.

Worked reference: `e2e/specs/clock-determinism.spec.ts`. Pattern:

```ts
// clock.install() MUST run before goto() — so do not use the `app` fixture.
await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
await page.goto('/?e2e');
await page.waitForFunction(() => !!window.__PANIC_STORES__);

// ... build a layout, spawn a train, keep simulation.setRunning(false) ...

// Freeze: pauseAt() must target a time >= the (advanced) clock, so pause
// a few seconds ahead of the current in-page time.
const now = await page.evaluate(() => Date.now());
await page.clock.pauseAt(new Date(now + 5000));
await page.evaluate(() => window.__PANIC_STORES__!.simulation.setRunning(true));

await page.clock.runFor(3000);   // advance exactly 3s of rAF ticks
```

**Validated facts (don't relearn these):**

- `clock.runFor(ms)` *does* drive the rAF game loop; `simElapsed` scales
  linearly with the ticks. ~16ms per frame, well under the 100ms
  `DELTA_TIME_CAP`.
- Determinism is **±1 frame**, not bit-identical. The variance is the moment
  the game loop registers its rAF (gated by React's effect flush after
  `setRunning(true)`), which races the frozen clock by at most one 16ms tick.
  Assert `distance`/`elapsed` with one-frame tolerance; **discrete event
  counts** (`simLog` length, bounces, collisions) ARE stable — assert those
  exactly.
- For *bit-identical* determinism you would need a synchronous
  `stepSimulation(dt)` extracted from `useGameLoop`'s rAF closure and exposed
  on the bridge. Not done yet — propose it if frame-exact tests are needed.
- Edge/node IDs are random UUIDs per layout — **never assert on IDs**, assert
  on geometry and counts.

For non-determinism-critical functional tests, just poll the event log with
`waitForFunction` (e.g. "≥4 traverse events") and bump `setSpeedMultiplier(3)`
to keep it fast. See `e2e/user-journey.spec.ts`.

## Visual regression & visual debugging

The Konva canvas is **byte-for-byte reproducible when static** (edit mode, no
simulation) — validated. So visual regression works:

```ts
await expect(page.getByTestId('canvas-container'))
  .toHaveScreenshot('layout.png', { maxDiffPixels: 0 });
```

- First run writes the baseline (test "fails" once) — rerun to compare.
- Baselines are **platform-specific** (`*-dev-darwin.png` vs linux). Keep
  visual-regression specs in the `dev` project (not CI) unless you commit a
  linux baseline generated on CI.
- For a **running** simulation, a screenshot is only ±1-frame stable — use
  `maxDiffPixels` tolerance, or freeze with `page.clock` first, or screenshot
  in edit mode.
- For ad-hoc visual debugging, `ScreenshotManager.capture()` saves a `.png`
  next to a `.state.json` so you can diff *what the store thought* against
  *what rendered*. `ConsistencyChecker.fullCheck()` automates that check.

## Playwright MCP & Test Agents

`npx playwright init-agents --loop=claude` scaffolded:

- `.mcp.json` — registers the `playwright-test` MCP server.
- `.claude/agents/playwright-test-{planner,generator,healer}.md` — Claude Code
  subagents for the plan → generate → heal loop.
- `.claude/prompts/playwright-test-*.md` — prompt templates.
- `e2e/seed.spec.ts` — seed test the planner runs first; `specs/` — test plans.

**Canvas caveat:** the planner/generator agents explore via the accessibility
tree (`browser_snapshot`). They see the toolbar/sidebars but are **blind to the
Konva canvas** — they cannot perceive tracks or trains. For anything on the
canvas, the **debug bridge is the source of truth**; drive and assert through
`window.__PANIC_STORES__`, not snapshots. Use the agents for DOM-shell coverage
(toolbar, parts bin, dialogs), the bridge for everything on the canvas.

## Writing a new test — checklist

1. CI-gating functional test → `e2e/<name>.spec.ts`; agentic/visual/clock test
   → `e2e/specs/<name>.spec.ts`.
2. Import `{ test, expect }` from `../fixtures/app-fixture` (or `@playwright/test`
   if you need `clock.install()` before navigation).
3. Drive canvas state via `StoreBridge`/`window.__PANIC_STORES__`; drive the
   DOM shell (toolbar, mode buttons, template `<select>`) via `getByTestId`.
4. Wait with `waitForFunction`/`waitForEdgeCount`/`waitForTrainCount` — never
   `waitForTimeout` for app state.
5. Assert counts and geometry, not UUIDs. Run `pnpm typecheck` before pushing.

## Gotchas (all validated)

- **`stores.addTrack()` bypasses the budget.** It is the low-level store action;
  the budget is charged only by the UI placement handler. Don't assert budget
  changes after bridge placement.
- **`mode`, `simulation`, `editor`, `effects` stores are NOT persisted**;
  `track`, `logic`, `budget`, `onboarding` ARE (localStorage). A reload resets
  the former and restores the latter.
- **Loading a template** via `[data-testid="file-template-selector"]` replaces
  the layout and auto-spawns trains + auto-starts the sim.
- The `dev` project needs `pnpm dev` running; the `chromium` project builds its
  own preview server — don't start one manually for it.
