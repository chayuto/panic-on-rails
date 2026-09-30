import { test, expect } from './fixtures/app-fixture.js';

test.describe('App Smoke Tests', () => {
    test.beforeEach(async ({ app }) => {
        // app fixture handles navigation and clean state
        void app;
    });

    test('should load the application', async ({ page }) => {
        // Title check
        await expect(page).toHaveTitle(/PanicOnRails/i);

        // Core layout elements are visible
        await expect(page.getByTestId('app')).toBeVisible();
        await expect(page.getByTestId('toolbar')).toBeVisible();
        await expect(page.getByTestId('app-main')).toBeVisible();
        await expect(page.getByTestId('canvas-container')).toBeVisible();
    });

    test('should start in Edit mode with PartsBin visible', async ({ page }) => {
        // Edit mode button should be active (aria-pressed=true)
        const editBtn = page.getByTestId('mode-edit-btn');
        await expect(editBtn).toHaveAttribute('aria-pressed', 'true');

        // PartsBin sidebar should be visible in Edit mode
        await expect(page.getByTestId('parts-bin')).toBeVisible();

        // TrainPanel should NOT be visible in Edit mode
        await expect(page.getByTestId('train-panel')).not.toBeVisible();
    });

    test('should have edit tools visible in Edit mode', async ({ page }) => {
        await expect(page.getByTestId('edit-tool-select')).toBeVisible();
        await expect(page.getByTestId('edit-tool-connect')).toBeVisible();
        await expect(page.getByTestId('edit-tool-delete')).toBeVisible();
    });

    test('should have file action buttons in toolbar', async ({ page }) => {
        await expect(page.getByTestId('file-new')).toBeVisible();
        await expect(page.getByTestId('file-save')).toBeVisible();
        await expect(page.getByTestId('file-load')).toBeVisible();
        await expect(page.getByTestId('file-template-selector')).toBeVisible();
    });

    test('should have view action buttons in toolbar', async ({ page }) => {
        await expect(page.getByTestId('view-grid-toggle')).toBeVisible();
        await expect(page.getByTestId('view-mute-toggle')).toBeVisible();
    });

    test('the toolbar stays on one line at laptop width, wallet included', async ({ page, app }) => {
        void app;
        // A laptop, and just past each width where the toolbar loosens up
        // (the app's name shows from 1361, roomier buttons from 1441, a
        // wider templates menu from 1501)
        for (const width of [1280, 1361, 1441, 1501]) {
            await page.setViewportSize({ width, height: 720 });
            const toolbar = await page.getByTestId('toolbar').boundingBox();
            const wallet = await page.getByTestId('wallet').boundingBox();
            expect(toolbar!.height, `at ${width}px`).toBeLessThan(64);
            expect(wallet!.y + wallet!.height, `at ${width}px`).toBeLessThanOrEqual(toolbar!.y + toolbar!.height);
        }
    });

    test('on a phone the canvas takes the whole width, and a built layout\'s train is in view', async ({ page, app }) => {
        void app;
        await page.setViewportSize({ width: 390, height: 844 });
        const look = () => page.evaluate(() => window.__PANIC_QA__!.look());
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-852').click();
        await expect.poll(async () => (await look()).trains.length).toBe(1);
        // The train panel sits under the canvas, not beside it
        await expect.poll(async () => (await look()).canvas.width).toBe(390);
        await expect.poll(async () => (await look()).trains[0].at.onScreen).toBe(true);
        // The small-screen warning goes when dismissed
        const warning = page.locator('.viewport-warning');
        await warning.getByRole('button', { name: 'Dismiss' }).click();
        await expect(warning).toHaveCount(0);
    });
});
