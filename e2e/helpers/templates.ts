/**
 * Loading a template through the file menu, the way a player does, and
 * then taking over the simulation's clock.
 */

import { expect, type Page } from '@playwright/test';
import type { StoreBridge } from './store-bridge';

/**
 * Pick a template by name (or its place in the menu) from the templates
 * menu, and wait for its track.
 * A template with trains starts them a moment after it's built: wait for
 * that too, then pause the loop, so the test steps the simulation itself
 * (`__PANIC_SIM__.run`). Returns the layout's edges.
 */
export async function loadTemplateByName(page: Page, stores: StoreBridge, name: string | { index: number }): Promise<string[]> {
    await page.getByTestId('file-template-selector').selectOption(name);
    await expect.poll(async () => Object.keys((await stores.getTrackState()).edges).length).toBeGreaterThan(0);
    if (Object.keys((await stores.getSimulationState()).trains).length > 0) {
        await expect.poll(async () => (await stores.getSimulationState()).isRunning).toBe(true);
    }
    await stores.setRunning(false);
    return Object.keys((await stores.getTrackState()).edges);
}
