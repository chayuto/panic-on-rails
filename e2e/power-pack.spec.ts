/**
 * The power pack: driving a train with the throttle, through the real UI
 * and the live game loop.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';

async function loadOval(page: Page): Promise<string> {
    await page.getByTestId('file-template-selector').selectOption('simple-oval');
    await expect.poll(() => page.evaluate(() =>
        Object.keys(window.__PANIC_STORES__!.simulation.getState().trains).length)).toBe(1);
    return page.evaluate(() => Object.keys(window.__PANIC_STORES__!.simulation.getState().trains)[0]);
}

const trainState = (page: Page, id: string) => page.evaluate((t) => {
    const train = window.__PANIC_STORES__!.simulation.getState().trains[t];
    return { speed: train.speed, direction: train.direction, crashed: !!train.crashed, reverseRequested: !!train.reverseRequested };
}, id);

test.describe('Power pack', () => {
    test('opening the throttle speeds the train up with momentum', async ({ page, app }) => {
        void app;
        const id = await loadOval(page);
        await expect(page.getByTestId(`train-speed-${id}`)).toHaveText('58 km/h');

        await page.getByTestId(`train-throttle-${id}`).fill('160');
        // Not instant: part-way there first...
        await expect.poll(async () => (await trainState(page, id)).speed).toBeGreaterThan(110);
        expect((await trainState(page, id)).speed).toBeLessThan(160);
        // ...then at the throttle
        await expect.poll(async () => (await trainState(page, id)).speed, { timeout: 5000 }).toBe(160);
        await expect(page.getByTestId(`train-speed-${id}`)).toHaveText('92 km/h');
    });

    test('taking a curve at full throttle derails the train, and the repair is billed', async ({ page, app }) => {
        void app;
        const id = await loadOval(page);
        const wallet = () => page.evaluate(() => window.__PANIC_STORES__!.collection.getState().wallet);
        const before = await wallet();

        await page.getByTestId(`train-throttle-${id}`).fill('300');
        await expect.poll(async () => (await trainState(page, id)).crashed, { timeout: 10_000 }).toBe(true);
        const log = await page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().simLog.map(e => e.type));
        expect(log).toContain('derail');
        expect(await wallet()).toBeLessThan(before);
    });

    test('the direction lever brakes to a stand before reversing', async ({ page, app }) => {
        void app;
        const id = await loadOval(page);
        await page.getByTestId(`train-reverse-${id}`).click();
        expect((await trainState(page, id)).reverseRequested).toBe(true);
        await expect(page.getByTestId(`train-reverse-${id}`)).toHaveAttribute('aria-pressed', 'true');

        await expect.poll(async () => (await trainState(page, id)).direction).toBe(-1);
        await expect.poll(async () => (await trainState(page, id)).speed).toBeGreaterThan(20);
        expect((await trainState(page, id)).reverseRequested).toBe(false);
    });
});
