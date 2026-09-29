import { test, expect } from './fixtures/app-fixture.js';

test.describe('Parts Bin', () => {
    test.beforeEach(async ({ app }) => {
        void app;
    });

    test('shows the pieces in the collection, with how many are left', async ({ page }) => {
        const partsBin = page.getByTestId('parts-bin');
        await expect(partsBin).toBeVisible();
        await expect(partsBin.getByRole('heading', { name: 'Parts' })).toBeVisible();

        // A new player owns the M1 box: straights and curves, no turnouts yet
        await expect(partsBin.getByRole('heading', { name: 'Straights' })).toBeVisible();
        await expect(partsBin.getByRole('heading', { name: 'Curves' })).toBeVisible();
        await expect(partsBin.getByRole('heading', { name: 'Turnouts' })).toHaveCount(0);
        await expect(page.getByTestId('part-left-kato-20-120')).toHaveText('×8');
    });

    test('free build shows every section of the catalog', async ({ page }) => {
        const partsBin = page.getByTestId('parts-bin');
        await page.getByTestId('mode-free').click();
        await expect(partsBin.getByRole('heading', { name: 'Straights' })).toBeVisible();
        await expect(partsBin.getByRole('heading', { name: 'Turnouts' })).toBeAttached();
        await expect(partsBin.getByRole('heading', { name: 'Crossings & crossovers' })).toBeAttached();
        await expect(partsBin.getByRole('heading', { name: 'Buffer stops' })).toBeAttached();
        await expect(page.locator('.part-left')).toHaveCount(0);
        await expect(page.getByTestId('wallet')).toHaveText(/Free build/);
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

        // No wooden track in the starter collection: the bin points to the shop
        await partsBin.getByRole('button', { name: 'Wooden' }).click();
        await expect(page.getByTestId('parts-bin-empty')).toBeVisible();
        await partsBin.getByRole('button', { name: 'N-Scale' }).click();

        await page.getByTestId('mode-free').click();

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

    test('the H0 and OO tabs hold Märklin C-track and Hornby Setrack, curved turnouts included', async ({ page }) => {
        const partsBin = page.getByTestId('parts-bin');
        await page.getByTestId('mode-free').click();
        await partsBin.getByRole('button', { name: 'H0', exact: true }).click();
        await expect(partsBin.getByText('Straight 188.3mm')).toBeVisible();
        await expect(partsBin.getByText('Curved Turnout Left')).toBeAttached();
        await expect(partsBin.getByText('Double Slip Switch')).toBeAttached();

        await partsBin.getByRole('button', { name: 'OO', exact: true }).click();
        await expect(partsBin.getByText('Straight 167.5mm')).toBeVisible();
        await expect(partsBin.getByText('Curved Point Left')).toBeAttached();
    });
});
