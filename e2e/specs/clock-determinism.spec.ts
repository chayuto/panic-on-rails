/**
 * Simulation determinism — Playwright Clock API for deterministic sim testing.
 *
 * The simulation runs on requestAnimationFrame inside useGameLoop.ts and uses
 * the rAF `timestamp` for delta-time. Playwright's Clock API overrides rAF +
 * performance.now(), so ticking the clock advances the train by a controlled,
 * reproducible amount instead of relying on flaky wall-clock waits.
 *
 * This spec is the worked reference for the technique (see the
 * `high-fidelity-frontend-testing` skill). It establishes:
 *  1. clock.runFor() drives the rAF game loop — the train actually moves.
 *  2. simElapsed scales linearly with clock ticks.
 *  3. Two independent runs of the same clock script match within ONE 16ms
 *     frame (not bit-identical — the rAF-registration moment races React's
 *     effect flush). Discrete event counts ARE stable.
 *  4. A static Konva canvas is byte-for-byte reproducible — toHaveScreenshot
 *     visual regression is viable.
 *
 * It does NOT use the `app` fixture because clock.install() must run before goto.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const PART = 'kato-20-000'; // standard 248mm straight

interface SimResult {
  edgeId: string;
  distance: number;
  direction: number;
  elapsed: number;
  logCount: number;
  bounces: number;
}

/** Build a tiny deterministic layout, spawn a train, tick the clock, read state. */
async function runDeterministicSim(page: Page, tickMs: number): Promise<SimResult> {
  // Clock MUST be installed before navigation.
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.waitForFunction(() => !!window.__PANIC_STORES__);

  // Clean slate + a single deterministic edge.
  const edgeId = await page.evaluate((part) => {
    const s = window.__PANIC_STORES__!;
    s.track.clearLayout();
    return s.track.addTrack(part, { x: 400, y: 300 }, 0);
  }, PART);
  expect(edgeId).toBeTruthy();

  // Enter simulate mode, spawn a train at distance 0, but keep it paused.
  await page.evaluate((eid) => {
    const s = window.__PANIC_STORES__!;
    s.mode.enterSimulateMode();
    s.simulation.spawnTrain(eid as never);
    s.simulation.setRunning(false);
  }, edgeId);

  // Freeze the clock. pauseAt() must target a time >= the current (advanced)
  // clock, so pause a few seconds ahead of "now". The sim loop is off during
  // this fast-forward, so it has no effect on train state.
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(now + 5000));
  // Start the loop. No rAF frames fire until runFor() — clock is frozen.
  await page.evaluate(() => window.__PANIC_STORES__!.simulation.setRunning(true));

  // Deterministically advance the simulation.
  await page.clock.runFor(tickMs);

  return page.evaluate(() => {
    const sim = window.__PANIC_STORES__!.simulation.getState();
    const train = Object.values(sim.trains)[0] as Record<string, unknown>;
    return {
      edgeId: train.currentEdgeId as string,
      distance: train.distanceAlongEdge as number,
      direction: train.direction as number,
      elapsed: sim.simElapsed,
      logCount: sim.simLog.length,
      bounces: sim.simLog.filter((e: { type: string }) => e.type === 'bounce').length,
    };
  });
}

test('clock.runFor() drives the rAF game loop (train actually moves)', async ({ page }) => {
  const result = await runDeterministicSim(page, 2000);
  console.log('after 2000ms tick:', JSON.stringify(result));
  // If the clock did NOT drive rAF, the train would never move and elapsed=0.
  // simElapsed accumulates dt from rAF deltas; ~2000ms of ticks => ~2.0s.
  expect(result.elapsed).toBeGreaterThan(1.5);
  expect(result.elapsed).toBeLessThan(2.2);
  // Train spawns at distance 0; if rAF ran, it advanced down the edge.
  expect(result.distance).toBeGreaterThan(0);
});

test('two independent runs match within one frame (determinism)', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const runA = await runDeterministicSim(await ctxA.newPage(), 3000);
  const runB = await runDeterministicSim(await ctxB.newPage(), 3000);
  await ctxA.close();
  await ctxB.close();

  console.log('run A:', JSON.stringify(runA));
  console.log('run B:', JSON.stringify(runB));

  // FINDING: the clock makes the sim deterministic to within ONE 16ms rAF
  // frame — not bit-identical. The variance is the moment the game loop's
  // rAF is registered (gated by React's effect flush after setRunning(true)),
  // which races the frozen clock by at most one tick. edgeId is a random
  // UUID per layout, so it is NOT compared — physics is.
  const ONE_FRAME_MS = 1000 / 60;
  const trainSpeed = 100; // px/s (observed: 1.6px drift per 16ms frame)
  expect(runB.direction).toBe(runA.direction);
  // elapsed differs by at most one frame
  expect(Math.abs(runB.elapsed - runA.elapsed) * 1000).toBeLessThanOrEqual(ONE_FRAME_MS + 1);
  // distance differs by at most one frame of travel
  expect(Math.abs(runB.distance - runA.distance)).toBeLessThanOrEqual(
    trainSpeed * (ONE_FRAME_MS / 1000) + 0.5,
  );
  // discrete event counts ARE stable
  expect(runB.logCount).toBe(runA.logCount);
  expect(runB.bounces).toBe(runA.bounces);
});

test('static track layout canvas is pixel-stable (visual regression viable)', async ({ page }) => {
  // Edit mode, no simulation => the Konva canvas is fully static and should be
  // byte-for-byte reproducible. This is the prerequisite for toHaveScreenshot()
  // visual-regression assertions, which the repo captures PNGs for but never diffs.
  await page.goto('/');
  await page.waitForFunction(() => !!window.__PANIC_STORES__);
  await page.evaluate((part) => {
    const s = window.__PANIC_STORES__!;
    s.track.clearLayout();
    for (let i = 0; i < 5; i++) {
      s.track.addTrack(part, { x: 220 + i * 70, y: 300 }, 0);
    }
    s.editor.resetView();
  }, PART);
  await page.waitForTimeout(200); // let Konva paint
  // First run writes the baseline (test fails once); subsequent runs compare.
  await expect(page.getByTestId('canvas-container')).toHaveScreenshot('static-5-straights.png', {
    maxDiffPixels: 0,
  });
});

test('elapsed time scales linearly with clock ticks (control)', async ({ browser }) => {
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const short = await runDeterministicSim(await ctx1.newPage(), 1000);
  const long = await runDeterministicSim(await ctx2.newPage(), 4000);
  await ctx1.close();
  await ctx2.close();

  console.log('1s tick elapsed:', short.elapsed, '| 4s tick elapsed:', long.elapsed);
  // simElapsed accumulates dt from rAF deltas; 4x the ticks => ~4x elapsed.
  expect(long.elapsed).toBeGreaterThan(short.elapsed * 3);
});
