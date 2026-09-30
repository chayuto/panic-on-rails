/**
 * Timetables through the real UI: give the M1 oval's station a departure
 * every 45 s, and the starter train keeps to it through a session, which
 * pays the timetable bonus on top of the crash-free one.
 */

import { test, expect } from './fixtures/app-fixture.js';

test.describe('Timetables', () => {
    test('a station on a 45 s timetable: the train waits for its departure, and a punctual session pays', async ({ page, app }) => {
        void app;
        await page.getByTestId('open-set-shelf').click();
        await page.getByTestId('set-build-kato-20-852').click();
        await expect.poll(() => page.evaluate(() => window.__PANIC_STORES__!.simulation.getState().isRunning)).toBe(true);

        // A platform in the middle of a straight, as the Station tool puts it
        await page.evaluate(() => {
            const { edges } = window.__PANIC_STORES__!.track.getState();
            const straight = Object.values(edges).find(e => e.partId === 'kato-20-000')!;
            window.__PANIC_STORES__!.logic.addStation(straight.id, straight.length / 2, 240);
        });

        // The timetable, set from the train panel
        const timetable = page.getByTestId('timetable');
        await expect(timetable).toContainText('Station 1');
        await page.getByLabel('Station 1 timetable').selectOption('45');
        await expect(page.getByTestId('timetable-next-Station 1')).toContainText(/^next \d+:\d\d$/);
        // Agents see it too
        const [seen] = await page.evaluate(() => window.__PANIC_QA__!.look().stations);
        expect(seen).toMatchObject({ name: 'Station 1', interval: 45 });
        expect(seen.next! % 45).toBe(0);

        // Run a session headlessly: the train waits at the platform for each departure
        await page.getByTestId('session-start').click();
        await page.evaluate(() => {
            window.__PANIC_STORES__!.simulation.setRunning(false);
            window.__PANIC_SIM__!.runSeconds(60);
        });
        await expect(page.getByTestId('session-tally')).toContainText(/ · \d+ of \d+ departures? ran$/);
        await page.evaluate(() => window.__PANIC_SIM__!.runSeconds(9 * 60 + 1));
        await expect(page.getByTestId('session-bonus')).toContainText(/^Crash-free and on time: \$\d+\.\d\d bonus$/);
    });
});
