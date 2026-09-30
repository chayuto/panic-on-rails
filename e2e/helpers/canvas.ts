import { expect, type Page } from '@playwright/test';

/**
 * Click the canvas at a world position (a track node, for example).
 *
 * The view may still be settling: loading a template fits it, then fits it
 * again once the trains start and the wider train panel shrinks the canvas.
 * So wait, as a person would, until the point has held still for a poll and
 * Konva has something clickable under it (its hit graph trails the store by
 * a frame), then click where it is now.
 */
export async function clickWorld(page: Page, world: { x: number; y: number }) {
    const where = () => page.evaluate(({ x, y }) => {
        const { zoom, pan } = window.__PANIC_STORES__!.editor.getState();
        const p = { x: x * zoom + pan.x, y: y * zoom + pan.y };
        return { ...p, hit: !!window.__PANIC_STAGE__?.getIntersection(p) };
    }, world);

    let last = '';
    await expect.poll(async () => {
        const p = await where();
        const key = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        const still = key === last;
        last = key;
        return still && p.hit;
    }).toBe(true);

    const p = await where();
    const box = (await page.getByTestId('canvas-container').boundingBox())!;
    await page.mouse.click(box.x + p.x, box.y + p.y);
}

/** Wait until the page has painted twice: React has committed and Konva has drawn. */
export async function nextFrame(page: Page): Promise<void> {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
