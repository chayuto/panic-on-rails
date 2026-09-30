# Agent QA and testing tools (2026-09-30)

How an agent can best QA this game's UI and UX: playing it as a real player, testing it headless
end to end, and which tools to adopt. This is a record of the research and of the playtests run
alongside it. The plan it led to is in `docs/ROADMAP.md` (Phase 7, "QA"); the how-to is the
`high-fidelity-frontend-testing` skill.

## Summary

- **For a canvas game, the agent should see through a semantic lens and act with real input.
  Vision can check how things look, but shouldn't be the eyes.**
  - Playwright's agent tooling reads the accessibility tree ("No vision models needed",
    [playwright-mcp](https://github.com/microsoft/playwright-mcp)), so it cannot see a Konva
    canvas.
  - Canvas apps and game-test tools expose their object model to tests instead:
    [tldraw's e2e skill](https://github.com/tldraw/tldraw/blob/main/skills/write-e2e-tests/SKILL.md),
    [AltTester](https://github.com/alttester/AltTester-Unity-SDK),
    [Poco](https://github.com/AirtestProject/Poco).
  - Konva's own advice is to test anything that touches a Stage in a real browser
    ([Konva testing](https://konvajs.org/docs/react/Testing.html)).
  - Hit-testing alone isn't enough here. `getIntersection` ignores `listening={false}` layers,
    such as the trains, and one `Shape` paints all the track
    ([Konva API](https://konvajs.org/api/Konva.Stage.html)).
- **Vision-only QA is not yet a reliable oracle.**
  - VLM visual-bug detection reached precision 0.50 on 19,738 gameplay keyframes
    ([arXiv 2603.22706](https://arxiv.org/abs/2603.22706)).
  - GPT-4o found 21% of the issues experts found in heuristic evaluation
    ([arXiv 2506.16345](https://arxiv.org/abs/2506.16345)).
  - The best agent found 48% of 124 seeded game bugs
    ([GBQA, arXiv 2604.02648](https://arxiv.org/abs/2604.02648)).
  - Synthetic users overestimate task completion; treat their findings as hypotheses
    ([NN/g](https://www.nngroup.com/articles/synthetic-users/)).
- **So the layering is:**
  1. Act through `window.__PANIC_QA__.look()` with real mouse and keyboard input.
  2. Assert through the stores and invariants.
  3. Use vision (screenshots, Claude's `zoom`) for periodic "does it look right" reviews, and
     check its findings against state before filing them.

## What the first playtests found

A `Player` that uses only the mouse and keyboard, and sees through `look()`, found these on its
first runs. None of them could show up in the existing bridge-driven specs, which make about 130
bridge calls against 8 real pointer actions.

| Finding | Playtest | Held by |
|---|---|---|
| Building the M1 oval by hand runs off the screen at the default zoom. It takes 7 zoom-outs; the view doesn't follow the build, and the `F` fit key isn't shown anywhere | build the oval by hand | `recoveries ≤ 7` |
| The "Skip tutorial" button floats over the bottom of the canvas; 2 drops landed on it | build the oval by hand | `obstructions ≤ 2` |
| The "You did it!" toast pops up over the layout for 5 s and caught a click meant for a set of points | throw every set of points | `obstructions ≤ 2` |
| At a low zoom, a curve dropped a few pixels to one side of the track end turns the wrong way (an S-bend) | exploratory run | Not yet budgeted |
| At the zoom that fits a large layout, a set of points is a ~6 px click target | throw every set of points | Not yet budgeted |
| `getPositionOnEdge called without nodes`, four times in a first session | open M1 and run | Fixed; console budget 0 |
| A new player affords V5 in 3 game minutes and V4 in 5. Starting Märklin (S1 plus an H0 train) takes about 35 minutes | headless pacing probe, save up for V4 | `minutes ≤ 10` for V4 |

## Headless E2E for a canvas/rAF game

- **Time:**
  - `page.clock` fakes `requestAnimationFrame` and `performance`
    ([docs](https://playwright.dev/docs/clock)). It's ±1 frame here.
  - `__PANIC_SIM__.run()` with the loop paused is the exact route.
  - With the clock installed, frame times and event timestamps are fake, so measure performance
    without it.
- **Canvas determinism** (verified by the research on Chromium 149):
  - Pixels are identical within one environment.
  - GPU rasterization (new headless on a Mac) changes them.
  - Text differs between operating systems.
  - Pin the headless mode and generate Linux baselines in the pinned Playwright Docker image
    ([docs](https://playwright.dev/docs/docker)).
- **Frame rate follows the host display:** 120 Hz on a Mac, 60 Hz on Linux. Budget frame times
  in milliseconds, with baselines per environment.
- **Input:** `page.mouse` events are trusted. Konva's `dragDistance` is 3 px. `mouse.wheel`
  doesn't wait for the zoom to finish.
- **Audio:**
  - An AudioContext starts suspended headless, and a click unlocks it.
  - Playwright's `page.evaluate` runs as a **user gesture** in Chromium
    ([source](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/chromium/crExecutionContext.ts)),
    so any bridge call unlocks audio too.
  - Test the event → sound mapping with a spied AudioContext.

## Tools

| Tool | Verdict | Why |
|---|---|---|
| Playwright 1.61.1 → 1.63.0 | Adopt | CLI and MCP bundled, WebP baselines, aria and screen snapshots in traces, `reducedMotion` ([release notes](https://github.com/microsoft/playwright/blob/main/docs/src/release-notes-js.md)) |
| `playwright-cli` | Adopt for agent sessions | Token-efficient, skill-based ([Coding agents](https://playwright.dev/docs/getting-started-cli)). Pre-1.0 |
| Console/page-error gate in the app fixture | Adopt | Every spec fails on a new console error |
| `@axe-core/playwright` 4.13 | Adopt | Accessibility of the page's DOM (not the canvas) |
| `toMatchAriaSnapshot` | Adopt, selectively | Toolbar, shop and dialogs |
| `@vitest/coverage-v8` | Adopt | Thresholds on simulation, stores, geometry; ratchet with `autoUpdate` |
| knip 6.38 | Adopt | Dead code; declare the bridge and lens as entry points |
| fast-check 4.10 + `@fast-check/vitest` | Adopt | Geometry properties. Model-based tests of place/delete/undo/join with shrinking ([docs](https://fast-check.dev/docs/advanced/model-based-testing/)); the join bug fixed in #137 is the kind it finds |
| Vitest browser mode | Adopt, narrowly | A real canvas for the track painter and car sprites |
| Stryker 10 | Trial, nightly, scoped | Do the geometry and simulation tests catch bugs? |
| Chrome DevTools MCP | Trial | Performance traces, heap, CPU throttling |
| Lighthouse CI | Skip | Load-centric. This game's risk is frame time |
| Chromatic, Percy, Lost Pixel | Skip | DOM re-rendering, canvas unclear, cost. Lost Pixel was archived 2026-04 |
| gremlins.js | Skip | Unmaintained since 2020; the seeded lens monkey is better |
| MSW, Storybook | Skip | No API calls; Vitest browser mode covers components |
| Midscene, Stagehand, browser-use in CI | Skip | Model cost and nondeterminism; at most occasional vision audits |

## UX metrics an agent can measure

These are metrics a script can take from a playtest run:
- actions to goal, against an expert path;
- misses (dead clicks);
- rage clicks, and a click followed by an error;
- recoveries and obstructions;
- the onboarding funnel, and stalls where nothing progresses for K actions;
- console problems;
- frame-time percentiles and long animation frames
  ([docs](https://developer.chrome.com/docs/web-platform/long-animation-frames));
- input → store → next frame latency;
- crash and derail rates over seeds, layouts and throttle styles;
- economy pacing;
- flashes of 3 per second or fewer
  ([WCAG 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)).

## Agent playtest sessions

Session-based testing, adapted for agents:
- **Charter:** each session has a charter, a persona and a setup (seed, mode, viewport).
- **Budget:** actions, minutes and tokens, as explicit stopping conditions.
- **Oracles:** invariants, console, the consistency checker.
- **Evidence:** a screenshot, the `look()` JSON and a trace step for every finding.
- **Debrief:**
  - Rate each finding on [Nielsen's heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
    and the game heuristics of Pinelle et al., with a 0–4 severity.
  - Turn it into a failing `Player` test before filing it.

Personas for this game:
- a new player who got a train set as a gift;
- a returning Kato hobbyist;
- an operator keeping trains apart;
- a keyboard-only player who prefers reduced motion;
- a player on a phone-size screen.

## Could not verify

- CLI vs MCP token savings (third-party figures only).
- Whether Chromatic and Percy capture `<canvas>` pixels.
- WebMCP's final API.
- Native x86 Linux results (only emulated).
- The 120 Hz headless rAF beyond one machine.
- TITAN and GBQA, which are single studies.
