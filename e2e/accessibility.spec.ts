/**
 * Accessibility of the page's DOM, the toolbar, panels and dialogs, with
 * axe against WCAG 2.2 A and AA. (What's on the canvas is covered by the QA
 * lens.) And motion that respects the player's settings.
 */

import type { Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { test, expect } from './fixtures/app-fixture.js';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectAccessible(page: Page, screen: string) {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    const found = violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(', ')}`);
    expect(found, `${screen}: axe found accessibility problems`).toEqual([]);
}

const running = (page: Page) => page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().isRunning);

test.describe('Accessibility', () => {
    test('the workbench, and Simulate with nothing built yet', async ({ page, app }) => {
        void app;
        await expectAccessible(page, 'first load');
        // The edit tools, named for a screen reader, the chosen one pressed
        await expect(page.getByTestId('toolbar')).toMatchAriaSnapshot(`
            - button "Select" [pressed]
            - button "Connect"
            - button "Delete"
            - button "Station"
            - button "Sensor" [disabled]
            - button "Signal" [disabled]
            - button "Wire" [disabled]
        `);
        await page.keyboard.press('7');
        await expect(page.getByRole('button', { name: 'Station' })).toHaveAttribute('aria-pressed', 'true');
        await page.getByTestId('mode-simulate-btn').click();
        await expect(page.getByTestId('train-panel')).toBeVisible();
        await expectAccessible(page, 'Simulate, empty');
        // One curve, too short for the starter train: the panel says why none was added
        await page.evaluate(() => window.__PANIC_STORES__!.track.addTrack('kato-20-120', { x: 0, y: 0 }, 0));
        await page.getByTestId('train-add-btn').click();
        await expect(page.getByTestId('train-notice')).toBeVisible();
        // The button fades in from disabled over 0.2 s; judge its colours once it has
        await expect.poll(() => page.getByTestId('train-add-btn').evaluate(b => getComputedStyle(b).opacity)).toBe('1');
        await expectAccessible(page, 'Simulate, no room for a train');
    });

    test('the hobby shop, every tab', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        await expectAccessible(page, 'shop: sets');
        for (const tab of ['parts', 'trains']) {
            await page.getByTestId(`shop-tab-${tab}`).click();
            await expect(page.getByTestId(`shop-tab-${tab}`)).toHaveAttribute('aria-selected', 'true');
            await expectAccessible(page, `shop: ${tab}`);
        }
    });

    test('trains running, a wreck on the line, and the pieces left to build with', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-852').click();
        await expect.poll(() => running(page)).toBe(true);
        await expectAccessible(page, 'Simulate, M1 running');

        // A station on a timetable
        await page.evaluate(() => {
            const { edges } = window.__PANIC_STORES__!.track.getState();
            const straight = Object.values(edges).find(e => e.partId === 'kato-20-000')!;
            const logic = window.__PANIC_STORES__!.logic;
            logic.setStationInterval(logic.addStation(straight.id, straight.length / 2, 240), 60);
        });
        await expect(page.getByTestId('timetable')).toBeVisible();
        await expectAccessible(page, 'Simulate, a station on a timetable');

        // An operating session, running and over
        await page.getByTestId('session-start').click();
        await expect(page.getByTestId('session')).toBeVisible();
        await expectAccessible(page, 'Simulate, a session running');
        await page.getByTestId('session-end').click();
        await expect(page.getByTestId('session-result')).toBeVisible();
        await expectAccessible(page, 'Simulate, a session over');

        await page.evaluate(() => {
            const sim = window.__PANIC_STORES__!.simulation;
            sim.setCrashed(Object.keys(sim.getState().trains)[0]);
        });
        await expect(page.getByTestId('wreck-warning')).toBeVisible();
        await expectAccessible(page, 'Simulate, a wreck');

        await page.getByTestId('mode-edit-btn').click();
        await expectAccessible(page, 'Edit, collection partly used');
    });

    test('the shopping list and the share dialog', async ({ page, app }) => {
        void app;
        await page.getByTestId('mode-free').click();
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-863').click();
        await expect.poll(() => running(page)).toBe(true);
        await page.getByTestId('mode-edit-btn').click();

        await page.getByTestId('open-shopping-list').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expectAccessible(page, 'shopping list');
        await page.keyboard.press('Escape');

        await page.getByTestId('share-layout').click();
        await expect(page.getByTestId('share-dialog')).toMatchAriaSnapshot(`
            - dialog "Share layout":
              - banner:
                - heading "Share this layout" [level=2]
                - button "Close"
              - textbox "Link to this layout": /#layout=v1\\./
              - button "Copy link"
        `);
        await expectAccessible(page, 'share dialog');
    });

    /** Watch every frame for the view shaking, from now on. */
    const watchForShaking = (page: Page) => page.evaluate(() => {
        const w = window as unknown as { shook?: boolean };
        w.shook = false;
        const look = () => {
            if (window.__PANIC_STORES__!.effects.getState().screenShake) w.shook = true;
            requestAnimationFrame(look);
        };
        look();
    });

    async function crashSwitchShowdown(page: Page) {
        await page.getByTestId('file-template-selector').selectOption('switch-showdown');
        await expect.poll(() => running(page)).toBe(true);
        await page.evaluate(() => window.__PANIC_STORES__!.simulation.setSpeedMultiplier(3));
        await expect.poll(() => page.evaluate(() => window.__PANIC_SIM__!.summarize().crashed), { timeout: 15_000 }).toBe(2);
        // The shake would last a few hundred milliseconds
        await page.waitForTimeout(500);
        return page.evaluate(() => !!(window as unknown as { shook?: boolean }).shook);
    }

    test('a crash shakes the view', async ({ page, app }) => {
        void app;
        await watchForShaking(page);
        expect(await crashSwitchShowdown(page)).toBe(true);
    });

    test('but not for a player who asked their system for less motion', async ({ page, app }) => {
        void app;
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await watchForShaking(page);
        expect(await crashSwitchShowdown(page)).toBe(false);
    });
});
