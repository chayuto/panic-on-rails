import { test, expect } from './fixtures/app-fixture.js';

test.describe('Parts Bin', () => {
    test.beforeEach(async ({ app }) => {
        void app;
    });

    test('should display part sections with track parts', async ({ page }) => {
        const partsBin = page.getByTestId('parts-bin');
        await expect(partsBin).toBeVisible();

        // Should have a "Parts" header
        await expect(partsBin.getByRole('heading', { name: 'Parts' })).toBeVisible();

        // Should have section headers for part categories
        await expect(partsBin.getByRole('heading', { name: 'Straights' })).toBeVisible();
        await expect(partsBin.getByRole('heading', { name: 'Curves' })).toBeVisible();
    });

    test('should display draggable part cards', async ({ page }) => {
        const partsBin = page.getByTestId('parts-bin');

        // Part cards should exist and be draggable
        const partCards = partsBin.locator('.part-card');
        const count = await partCards.count();
        expect(count).toBeGreaterThan(0);

        // Each card should have a label
        const firstCard = partCards.first();
        await expect(firstCard.locator('.part-label')).toBeVisible();
    });

    test('should switch between N-Scale and Wooden systems', async ({ page }) => {
        const partsBin = page.getByTestId('parts-bin');

        // N-Scale tab should be active by default
        const nScaleTab = partsBin.getByRole('button', { name: 'N-Scale' });
        const woodenTab = partsBin.getByRole('button', { name: 'Wooden' });

        await expect(nScaleTab).toHaveClass(/active/);

        // Switch to Wooden
        await woodenTab.click();
        await expect(woodenTab).toHaveClass(/active/);
        await expect(nScaleTab).not.toHaveClass(/active/);

        // Should still show parts
        const partCards = partsBin.locator('.part-card');
        const count = await partCards.count();
        expect(count).toBeGreaterThan(0);
    });
});
