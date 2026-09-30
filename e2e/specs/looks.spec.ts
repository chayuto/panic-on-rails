/**
 * How each brand's track and trains look, compared pixel for pixel with
 * baselines: the track painter's looks, raised track and its shadows, and
 * the car sprites.
 *
 * The baselines are made where they're compared, in the nightly's pinned
 * Playwright image on Linux (nightly.yml), so these run there only. After
 * a change meant to alter a look, run the nightly by hand with "update
 * snapshots" and commit the baselines it uploads.
 *
 * Each set's first plan is built with its trains standing where the plan
 * puts them, the loop paused, and the view fitted as F fits it.
 */

import { test, expect } from '../fixtures/app-fixture';
import { nextFrame } from '../helpers/canvas';

const LOOKS: { set: string; name: string }[] = [
    // Kato's ballast; a US diesel and its cars
    { set: 'kato-106-0018', name: 'kato-super-chief' },
    // Raised track: viaducts on piers, their shadows, a truss bridge
    { set: 'kato-20-861', name: 'kato-v2-viaduct' },
    // Concrete slab double track
    { set: 'kato-20-877', name: 'kato-v17-slab' },
    // A double-track viaduct
    { set: 'kato-20-872', name: 'kato-v13-double-viaduct' },
    // Märklin's grey bed and centre studs; H0-sized cars
    { set: 'marklin-24905', name: 'marklin-c5' },
    // Hornby's bare sleepers; a tank engine, its coach and its wagon
    { set: 'hornby-R1296M', name: 'hornby-smokey-joe' },
];

for (const { set, name } of LOOKS) {
    test(`looks: ${name}`, async ({ page, app }) => {
        void app;
        test.skip(test.info().project.name !== 'specs' || process.platform !== 'linux',
            "The baselines are made in the nightly's Linux image");

        await page.evaluate((id) => {
            const stores = window.__PANIC_STORES__!;
            stores.onboarding.skipOnboarding();
            window.__PANIC_SIM__!.loadSetPlan(id);
            stores.mode.enterSimulateMode();
        }, set);
        // The train panel takes the parts bin's place and narrows the canvas: fit after
        await nextFrame(page);
        await page.keyboard.press('f');
        await nextFrame(page);

        await expect(page.getByTestId('canvas-container')).toHaveScreenshot(`${name}.png`, { maxDiffPixels: 0 });
    });
}
