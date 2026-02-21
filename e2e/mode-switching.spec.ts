import { test, expect } from './fixtures/app-fixture.js';

test.describe('Mode Switching', () => {
    test.beforeEach(async ({ app }) => {
        void app;
    });

    test('should switch from Edit to Simulate mode via button click', async ({ page }) => {
        // Start in Edit mode
        await expect(page.getByTestId('mode-edit-btn')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId('parts-bin')).toBeVisible();

        // Click Simulate button
        await page.getByTestId('mode-simulate-btn').click();

        // Verify Simulate mode is active
        await expect(page.getByTestId('mode-simulate-btn')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId('mode-edit-btn')).toHaveAttribute('aria-pressed', 'false');

        // TrainPanel should now be visible, PartsBin hidden
        await expect(page.getByTestId('train-panel')).toBeVisible();
        await expect(page.getByTestId('parts-bin')).not.toBeVisible();
    });

    test('should switch back from Simulate to Edit mode', async ({ page }) => {
        // Switch to Simulate first
        await page.getByTestId('mode-simulate-btn').click();
        await expect(page.getByTestId('train-panel')).toBeVisible();

        // Switch back to Edit
        await page.getByTestId('mode-edit-btn').click();

        // Verify Edit mode is active again
        await expect(page.getByTestId('mode-edit-btn')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId('parts-bin')).toBeVisible();
        await expect(page.getByTestId('train-panel')).not.toBeVisible();
    });

    test('should switch modes via keyboard shortcut (M key)', async ({ page }) => {
        // Start in Edit mode
        await expect(page.getByTestId('mode-edit-btn')).toHaveAttribute('aria-pressed', 'true');

        // Press M to switch to Simulate
        await page.keyboard.press('m');
        await expect(page.getByTestId('mode-simulate-btn')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId('train-panel')).toBeVisible();

        // Press M again to switch back to Edit
        await page.keyboard.press('m');
        await expect(page.getByTestId('mode-edit-btn')).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByTestId('parts-bin')).toBeVisible();
    });

    test('should show simulate toolbar controls in Simulate mode', async ({ page }) => {
        // Switch to simulate mode
        await page.getByTestId('mode-simulate-btn').click();

        // Simulate toolbar should have play/pause and add train buttons
        await expect(page.getByTestId('sim-play-pause')).toBeVisible();
        await expect(page.getByTestId('sim-add-train')).toBeVisible();
    });
});
