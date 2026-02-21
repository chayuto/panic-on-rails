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
});
