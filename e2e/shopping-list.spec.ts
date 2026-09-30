/**
 * The shopping list — the layout on the table as real products to buy —
 * and the loose parts shop for every track system.
 */

import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures/app-fixture.js';

test.describe('Shopping list', () => {
    test('lists the layout as real products, with what you own, and downloads it as CSV', async ({ page, app }) => {
        void app;
        // A new player owns an M1 box: build it
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-852').click();
        await expect.poll(() => page.evaluate(() => Object.keys(window.__PANIC_STORES__!.track.getState().edges).length)).toBe(16);

        await page.getByTestId('open-shopping-list').click();
        const list = page.getByTestId('shopping-list');
        await expect(list).toBeVisible();
        await expect(list.getByTestId('shopping-line-kato-20-120')).toContainText('Curve R315-45°');
        // Every piece is already in the collection
        await expect(list.getByTestId('shopping-list-cost')).toHaveText('$0.00');

        const download = page.waitForEvent('download');
        await list.getByTestId('shopping-list-csv').click();
        const file = await download;
        expect(file.suggestedFilename()).toBe('shopping-list.csv');
        const csv = await readFile((await file.path())!, 'utf8');
        expect(csv).toContain('kato,20-120,Curve R315-45°,8,8,0,2.50,0.00,');

        await page.keyboard.press('Escape');
        await expect(list).toBeHidden();
    });

    test('the loose parts shop sells every track system, not only N', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('shop-tab-parts').click();
        const shop = page.getByTestId('set-shelf');
        await expect(shop.getByRole('heading', { name: 'Kato Unitrack · N-Scale' })).toBeVisible();
        await expect(shop.getByRole('heading', { name: 'Märklin C-track · H0' })).toBeAttached();
        await expect(shop.getByRole('heading', { name: 'Hornby Setrack · OO' })).toBeAttached();
        await expect(page.getByTestId('shop-part-marklin-24188')).toBeAttached();
        await expect(page.getByTestId('shop-part-hornby-R600')).toBeAttached();
    });
});
