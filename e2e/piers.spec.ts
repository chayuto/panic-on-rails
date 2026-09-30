/**
 * The Pier tool through the real UI: click a joint of the M1 oval to raise
 * it onto Kato's next support, and Shift-click to lower it.
 */

import { test, expect } from './fixtures/app-fixture.js';
import { clickWorld } from './helpers/canvas.js';

test.describe('Piers', () => {
    test('the Pier tool raises a joint onto Kato\'s supports, and Shift-click lowers it', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-852').click();
        await expect.poll(() => page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().isRunning)).toBe(true);

        await page.getByTestId('mode-edit-btn').click();
        await page.getByTestId('edit-tool-pier').click();
        // The joint between two of the straights
        const joint = await page.evaluate(() => {
            const { edges, nodes } = window.__PANIC_STORES__!.track.getState();
            const node = Object.values(nodes).find(n =>
                n.connections.length === 2 && n.connections.every(id => edges[id].partId === 'kato-20-000'))!;
            return { id: node.id, at: node.position };
        });
        const height = () => page.evaluate(id => window.__PANIC_STORES__!.track.getState().nodes[id]?.height ?? 0, joint.id);

        await clickWorld(page, joint.at);
        await expect.poll(height).toBe(5);
        await clickWorld(page, joint.at);
        await expect.poll(height).toBe(10);
        await page.keyboard.down('Shift');
        await clickWorld(page, joint.at);
        await page.keyboard.up('Shift');
        await expect.poll(height).toBe(5);
    });
});
