import { expect, type Page } from '@playwright/test';

/** Click the canvas at a world position (a track node, for example). */
export async function clickWorld(page: Page, world: { x: number; y: number }) {
    const screen = await page.evaluate(({ x, y }) => {
        const { zoom, pan } = window.__PANIC_STORES__!.editor.getState();
        return { x: x * zoom + pan.x, y: y * zoom + pan.y };
    }, world);
    // Konva draws its hit graph a frame after the store changes: wait until
    // something clickable is actually under the point
    await expect.poll(() => page.evaluate((p) => !!window.__PANIC_STAGE__?.getIntersection(p), screen)).toBe(true);
    const box = (await page.getByTestId('canvas-container').boundingBox())!;
    await page.mouse.click(box.x + screen.x, box.y + screen.y);
}
