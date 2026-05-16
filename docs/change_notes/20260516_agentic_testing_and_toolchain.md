# Agentic testing research + toolchain upgrade — 2026-05-16

Deep research into recent Playwright / agentic-testing developments, validated
against this repo, plus the Node 24 / pnpm 11 upgrade.

## 1. Research summary (Playwright 1.56 → 1.59, 2026)

| Release | Relevant capability |
|---------|---------------------|
| **1.56** | Playwright **Test Agents** — planner / generator / healer loop. `init-agents`. |
| **1.57** | Runs on Chrome-for-Testing; `webServer.wait` regex. |
| **1.58** | HTML-report Timeline / Speedboard. *(installed: `1.58.2`)* |
| **1.59** | Agentic release: `page.screencast` API, CLI trace analysis, `browser.bind()`, `--debug=cli`, async-disposable resources. |
| Ongoing | **Playwright MCP** — accessibility-tree-first browser automation for LLMs; `--caps=vision` for coordinate clicks. **Clock API** — fakes `requestAnimationFrame` + `performance.now()`. |

Community direction in 2026: MCP standardised the agent↔browser bridge;
accessibility-tree snapshots are the default (token-cheap) but **blind to
`<canvas>`** — the documented "shadow DOM / canvas" blind spot. For a
canvas-first app like this one, a **state bridge beats a snapshot**.

## 2. Ideas validated against this repo

Each was tested empirically — see `e2e/specs/clock-determinism.spec.ts`.

| Idea | Result |
|------|--------|
| **Clock API drives the rAF game loop** | ✅ `clock.runFor(ms)` advances `useGameLoop`'s rAF loop; `simElapsed` scales linearly with ticks. |
| **Deterministic simulation tests** | ⚠️ Deterministic to **±1 frame (16ms)**, not bit-identical. The rAF-registration moment races React's effect flush. Discrete event counts (`simLog`, bounces, collisions) ARE exact. Still a huge win over flaky `waitForTimeout`. |
| **Visual regression on the Konva canvas** | ✅ A *static* canvas (edit mode) is byte-for-byte reproducible — `toHaveScreenshot({ maxDiffPixels: 0 })` passes across runs. A *running* sim is only ±1-frame stable. |
| **Debug bridge in production builds** | ✅ `?e2e` activates `window.__PANIC_STORES__` in the preview/prod build — so CI tests can now verify the *shipped* app, not just dev. |
| **Playwright Test Agents (`init-agents --loop=claude`)** | ✅ Scaffolds `.mcp.json` + `.claude/agents/*` subagents + `e2e/seed.spec.ts`. Useful for the DOM shell; **blind to the canvas** (a11y-tree based). |
| Bit-identical determinism | ❌ Not achievable with the clock alone — would need a synchronous `stepSimulation(dt)` extracted from `useGameLoop`. Recommended only if frame-exact tests become necessary. |

## 3. What changed

- **Toolchain:** Node **24.15.0 LTS** + pnpm **11.1.1**. Pinned via
  `package.json` (`packageManager`, `engines`) and `.nvmrc`. CI workflows
  bumped (`actions/setup-node@v6` → Node 24; `pnpm/action-setup` now reads the
  `packageManager` field). Verified: typecheck, lint, 706 unit tests, build.
- **`e2e/user-journey.spec.ts`** — 7 user-flow tests in the **`chromium` (CI)**
  project: boot, build, persistence, template + simulation, pause/resume, mode
  switching, no-console-errors. CI now proves the production build works.
- **`e2e/specs/clock-determinism.spec.ts`** — the worked reference for
  Clock-API determinism + canvas visual regression.
- **`e2e/fixtures/app-fixture.ts`** — navigates to `/?e2e` so the debug bridge
  is available against the production build.
- **Skill:** `.claude/skills/high-fidelity-frontend-testing/` — project-level
  operating guide for E2E testing, deterministic sim testing, and visual
  debugging.
- **Agentic scaffold:** `.mcp.json`, `.claude/agents/playwright-test-*`,
  `.claude/prompts/playwright-test-*`, `e2e/seed.spec.ts`, `specs/README.md`
  (from `playwright init-agents --loop=claude`).

## 4. Recommendations not yet done

- **Synchronous `stepSimulation(dt)`** extracted from `useGameLoop`'s rAF
  closure and exposed on the bridge → bit-identical determinism + faster tests.
- **Upgrade to Playwright 1.59** for `page.screencast` (video receipts of
  agentic runs) and CLI trace analysis.
- Generate **linux visual baselines on CI** to move visual-regression specs
  into the CI gate.
