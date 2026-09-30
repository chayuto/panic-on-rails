/**
 * Frame time, warn-only: a busy layout run live for a few seconds, timed
 * from the page. The numbers belong to the environment (a headless CI
 * runner renders in software), so they're reported for comparing runs of
 * the same environment, not judged. Only a collapse fails.
 *
 * The report is attached to the test (frame-time.json) and noted in its
 * annotations, which the HTML report shows.
 */

import { test, expect } from '../fixtures/app-fixture';

const SECONDS = 6;
/** Interval of a frame that missed its vsync, at 60 Hz (ms) */
const LATE = 25;

interface FrameStats {
    frames: number;
    p50: number;
    p95: number;
    max: number;
    /** Share of frames that came late (%) */
    late: number;
    /** Long animation frames Chromium reported (over 50 ms) */
    longAnimationFrames: number | null;
}

test('frame time: Hornby Pack F with six trains running', async ({ page, app }, testInfo) => {
    void app;
    await page.getByTestId('mode-free').click();
    await page.getByTestId('open-set-shelf').click();
    await page.getByTestId('set-build-hornby-R8226').click();
    await expect.poll(() => page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().isRunning)).toBe(true);
    // Four more trains for load, as a player adds them
    for (let i = 0; i < 4; i++) await page.getByTestId('train-add-btn').click();
    await expect.poll(() => page.evaluate(() => Object.keys(window.__PANIC_STORES__!.simulation.getState().trains).length)).toBe(6);

    const stats = await page.evaluate(({ seconds, late }) => new Promise<FrameStats>(resolve => {
        const intervals: number[] = [];
        let longFrames: number | null = null;
        let observer: PerformanceObserver | undefined;
        try {
            observer = new PerformanceObserver(list => { longFrames = (longFrames ?? 0) + list.getEntries().length; });
            observer.observe({ type: 'long-animation-frame', buffered: false });
            longFrames = 0;
        } catch {
            // Not every browser reports long animation frames
        }
        let last = performance.now();
        const end = last + seconds * 1000;
        const frame = (t: number) => {
            intervals.push(t - last);
            last = t;
            if (t < end) {
                requestAnimationFrame(frame);
                return;
            }
            observer?.disconnect();
            const sorted = [...intervals].sort((a, b) => a - b);
            const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
            const round = (n: number) => Math.round(n * 10) / 10;
            resolve({
                frames: intervals.length,
                p50: round(at(0.5)),
                p95: round(at(0.95)),
                max: round(sorted[sorted.length - 1]),
                late: round((100 * intervals.filter(i => i > late).length) / intervals.length),
                longAnimationFrames: longFrames,
            });
        };
        requestAnimationFrame(frame);
    }), { seconds: SECONDS, late: LATE });

    const summary = `${stats.frames} frames in ${SECONDS} s: p50 ${stats.p50} ms, p95 ${stats.p95} ms, max ${stats.max} ms, ${stats.late}% late, ${stats.longAnimationFrames ?? 'n/a'} long animation frames`;
    testInfo.annotations.push({ type: 'frame-time', description: summary });
    await testInfo.attach('frame-time.json', { body: JSON.stringify(stats, null, 2), contentType: 'application/json' });
    console.log(`[frame-time] ${summary}`);

    // Warn-only for now: fail only on a collapse, ten frames a second or worse
    expect(stats.p95).toBeLessThan(100);
});
