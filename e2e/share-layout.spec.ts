/**
 * Sharing a layout by link: copy it from one browser, open it in another.
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';

const edgeCount = (page: Page) =>
    page.evaluate(() => Object.keys(window.__PANIC_STORES__!.track.getState().edges).length);

const openEnds = (page: Page) =>
    page.evaluate(() => Object.values(window.__PANIC_STORES__!.track.getState().nodes)
        .filter(n => n.connections.length === 1 && !n.bumper).length);

/** Build a set's first plan from the shelf, in free build, and get its share link's fragment. */
async function shareBuiltSet(page: Page, setId: string): Promise<string> {
    await page.getByTestId('mode-free').click();
    await page.getByTestId('open-set-shelf').click();
    await page.getByTestId(`set-build-${setId}`).click();
    await expect.poll(() => edgeCount(page)).toBeGreaterThan(0);
    await page.getByTestId('share-layout').click();
    const link = await page.getByTestId('share-link').inputValue();
    expect(link).toMatch(/#layout=v1\./);
    return new URL(link).hash;
}

test.describe('Sharing a layout by link', () => {
    test('a shared V7 layout opens elsewhere exactly as it was, in free build', async ({ page, app, browser }) => {
        void app;
        const hash = await shareBuiltSet(page, 'kato-20-866');
        const edges = await edgeCount(page);

        // Someone else, in a fresh browser, opens the link
        const other = await (await browser.newContext()).newPage();
        await other.goto(`/?e2e${hash}`);
        await expect.poll(() => edgeCount(other)).toBe(edges);
        expect(await openEnds(other)).toBe(0);
        // The scissors crossover's four points came back as points
        expect(await other.evaluate(() => Object.values(window.__PANIC_STORES__!.track.getState().nodes)
            .filter(n => n.type === 'switch').length)).toBe(4);
        await expect(other.getByTestId('wallet')).toHaveText(/Free build/);
        // The link is used up: reloading keeps later work
        expect(new URL(other.url()).hash).toBe('');
    });

    test('asks before replacing a layout already on the table', async ({ page, app }) => {
        void app;
        const hash = await shareBuiltSet(page, 'kato-20-852');
        // The player's own work: something else on the table
        await page.evaluate(() => {
            window.__PANIC_STORES__!.track.clearLayout();
            window.__PANIC_STORES__!.track.addTrack('kato-20-000', { x: 200, y: 200 }, 0);
        });
        await page.goto(`/?e2e${hash}`);
        const prompt = page.getByTestId('shared-layout-prompt');
        await expect(prompt).toContainText('16 pieces');
        await page.getByTestId('shared-layout-cancel').click();
        await expect(prompt).toBeHidden();
        expect(await edgeCount(page)).toBe(1);

        await page.goto(`/?e2e${hash}`);
        await page.getByTestId('shared-layout-open').click();
        await expect.poll(() => edgeCount(page)).toBe(16);
    });

    test('says so when a link is damaged', async ({ page, app }) => {
        void app;
        await page.goto('/?e2e#layout=v1.not-a-layout');
        await expect(page.getByTestId('shared-layout-error')).toContainText('damaged');
    });
});
