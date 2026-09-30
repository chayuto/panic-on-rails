/**
 * Playtests: goals a real player has, played with the mouse and keyboard
 * only, seeing the canvas through `__PANIC_QA__.look()` (helpers/player.ts).
 *
 * Each test asserts the goal can be reached, and holds the effort it took
 * to a budget: a change that makes the game harder to play fails here.
 * When the game gets easier, lower the budget. Metrics and a journal of
 * what the player did are written to e2e-results/playtest/<test>.json.
 */

import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/app-fixture';
import { Player } from '../helpers/player';

const M1 = 'kato-20-852';
const V4 = 'kato-20-863';

/** Graph problems: edges ending at missing nodes, nodes listing missing edges. Read-only. */
function integrityProblems(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const { nodes, edges } = window.__PANIC_STORES__!.track.getState();
        const problems: string[] = [];
        for (const e of Object.values(edges)) {
            for (const id of [e.startNodeId, e.endNodeId]) {
                if (!nodes[id]?.connections.includes(e.id)) problems.push(`${e.partId} edge → missing node`);
            }
        }
        for (const n of Object.values(nodes)) {
            for (const id of n.connections) if (!edges[id]) problems.push('node → missing edge');
        }
        return problems;
    });
}

test.describe('Playtests', () => {
    test('a new player builds the starter oval by hand from the M1 box', async ({ page, app }) => {
        void app;
        const player = new Player(page);
        const start = await player.look();
        player.note(`hints: ${start.hints.join(' / ')}`);

        // The M1 box, laid out as Kato's manual shows: 682mm of straight a side
        const curves = Array<string>(4).fill('Curve R315-45°');
        const plan = [
            'Straight 248mm', 'Straight 248mm', 'Straight 124mm', 'Straight 62mm', ...curves,
            'Straight 248mm', 'Straight 248mm', 'Rerailer 124mm', 'Feeder 62mm', ...curves,
        ];
        const { canvas } = start;
        await player.dragPart(plan[0], { x: canvas.x + canvas.width / 3, y: canvas.y + canvas.height / 3, onScreen: true, clear: true });
        for (const label of plan.slice(1)) {
            // Straight on for a straight; hover right of the end for a curve that turns right
            const turn = label.startsWith('Curve') ? 'right' : 'ahead';
            const drop = await player.bringIntoView(l => l.openEnds.at(-1)?.drop[turn]);
            if (!drop) break;
            await player.dragPart(label, drop);
        }

        const done = await player.look();
        player.note(`built ${done.pieces.length} pieces, ${done.openEnds.length} open ends, hints: ${done.hints.join(' / ')}`);
        const { metrics } = player.report('build-oval-by-hand', { pieces: done.pieces.length, openEnds: done.openEnds.length });

        expect(done.pieces).toHaveLength(16);
        expect(done.openEnds, 'the oval closes').toHaveLength(0);
        expect(await integrityProblems(page)).toEqual([]);
        // Budgets
        expect(metrics.misses, 'drops that placed nothing').toBe(0);
        // 7 today: the view doesn't follow the build, and the Skip tutorial button
        // covers the bottom of the canvas. Lower these when either is fixed.
        expect(metrics.recoveries, 'zooming out because the track ran off screen or under a button').toBeLessThanOrEqual(7);
        expect(metrics.obstructions, 'the Skip tutorial button in the way').toBeLessThanOrEqual(2);
        expect(player.consoleProblems).toEqual([]);
    });

    test('a new player opens the M1 box and runs a train', async ({ page, app }) => {
        void app;
        const player = new Player(page);
        await player.click(page.getByTestId('open-set-shelf'));
        await player.click(page.getByTestId(`set-build-${M1}`));
        // The layout's train is spawned at once; the trains start a moment later
        await expect.poll(async () => (await player.look()).running).toBe(true);
        const first = await player.look();
        player.note(`train running: ${first.running}, ${first.trains[0].name}, ${first.trains[0].kmh} km/h`);

        await player.waitSimSeconds(60);
        const later = await player.look();
        player.note(`after a minute: wallet ${later.wallet}`);
        const { metrics } = player.report('open-m1-and-run', { walletBefore: first.wallet, walletAfter: later.wallet });

        expect(first.trains).toHaveLength(1);
        expect(later.wallet!).toBeGreaterThan(first.wallet!);
        // Budget: from the first screen to a running train
        expect(metrics.actions).toBeLessThanOrEqual(2);
        expect(player.consoleProblems).toEqual([]);
    });

    test('a player saves up for V4 and builds its siding', async ({ page, app }) => {
        void app;
        const player = new Player(page);
        await player.click(page.getByTestId('open-set-shelf'));
        await player.click(page.getByTestId(`set-build-${M1}`));
        await expect.poll(async () => (await player.look()).running).toBe(true);

        // Look at V4's price tag in the shop, then run trains until it's affordable
        await player.click(page.getByTestId('open-set-shelf'));
        const tag = await page.getByTestId(`set-box-${V4}`).locator('.set-box-price').innerText();
        const price = Math.round(Number(tag.replace(/[^0-9.]/g, '')) * 100);
        await player.press('Escape');
        let minutes = 0;
        while (minutes < 20 && (await player.look()).wallet! < price) {
            await player.waitSimSeconds(60);
            minutes++;
        }
        player.note(`saved up in ${minutes} game minutes`);

        await player.click(page.getByTestId('open-set-shelf'));
        await player.click(page.getByTestId(`set-buy-${V4}`));
        await player.click(page.getByTestId(`set-build-${V4}`));
        // Replacing the layout asks first
        const confirm = page.getByTestId('set-build-confirm');
        if (await confirm.isVisible()) await player.click(confirm);
        await expect.poll(async () => {
            const l = await player.look();
            return l.points.length === 2 && l.running;
        }).toBe(true);
        const built = await player.look();
        const { metrics } = player.report('save-up-for-v4', { minutes, pieces: built.pieces.length, points: built.points.length });

        expect(built.openEnds).toHaveLength(0);
        expect(built.running).toBe(true);
        // Budgets: a first expansion within ten game minutes, in a handful of clicks
        expect(minutes).toBeLessThanOrEqual(10);
        expect(metrics.clicks).toBeLessThanOrEqual(7);
        expect(player.consoleProblems).toEqual([]);
    });

    for (const [brand, setId] of [['Kato V7', 'kato-20-866'], ['Märklin C5', 'marklin-24905'], ['Hornby Pack F', 'hornby-R8226']] as const) {
        test(`${brand}: every set of points can be thrown by clicking where it is drawn`, async ({ page, app }) => {
            void app;
            const player = new Player(page);
            await player.click(page.getByTestId('mode-free'));
            await player.click(page.getByTestId('open-set-shelf'));
            await player.click(page.getByTestId(`set-build-${setId}`));
            await expect.poll(async () => (await player.look()).running).toBe(true);
            // Pause, the way a player would, so trains aren't in the way
            await player.press('Space');

            const count = (await player.look()).points.length;
            const unreachable: string[] = [];
            for (let i = 0; i < count; i++) {
                // Look again each time: linked points move together
                let p = (await player.look()).points[i];
                if (p.at.onScreen && !p.at.clear) {
                    // A hint or toast in the way: note it, then close it as a player would
                    player.metrics.obstructions++;
                    player.note(`${p.part} at (${p.at.x}, ${p.at.y}) is covered`);
                    await player.dismissOverlays();
                    p = (await player.look()).points[i];
                }
                if (!p.at.clear) {
                    unreachable.push(`${p.part} at (${p.at.x}, ${p.at.y}) is ${p.at.onScreen ? 'covered' : 'off screen'}`);
                    continue;
                }
                await player.click(p.at);
                const after = (await player.look()).points[i].set;
                if (after === p.set) {
                    const under = await page.evaluate(({ x, y }) => {
                        const rect = document.querySelector('[data-testid="canvas-container"]')!.getBoundingClientRect();
                        const shape = window.__PANIC_STAGE__?.getIntersection({ x: x - rect.left, y: y - rect.top });
                        const el = document.elementFromPoint(x, y);
                        return `${shape ? shape.getClassName() : 'no shape'} / ${el?.tagName}.${el?.className}`;
                    }, p.at);
                    await page.screenshot({ path: `e2e-results/playtest/points-${setId}-${i}.png` });
                    unreachable.push(`${p.part} at (${p.at.x}, ${p.at.y}) did not move (under the cursor: ${under})`);
                }
            }
            const points = { length: count };
            const { metrics } = player.report(`throw-points-${setId}`, { points: points.length, unreachable });
            expect(points.length).toBeGreaterThan(0);
            expect(unreachable).toEqual([]);
            // Budget: the "You did it!" toast pops up over the layout for five seconds
            // after the first run, and can hide a set of points or catch a click
            expect(metrics.obstructions).toBeLessThanOrEqual(2);
            expect(player.consoleProblems).toEqual([]);
        });
    }

    test('a monkey plays for 60 moves: no errors, the track stays whole', async ({ page, app }) => {
        void app;
        test.setTimeout(120_000);
        const player = new Player(page);
        // Seeded, so a failure replays exactly
        let seed = 20260930;
        const random = () => {
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        const pick = <T,>(items: T[]): T => items[Math.floor(random() * items.length)];
        const parts = ['Straight 248mm', 'Curve R315-45°', 'Straight 124mm'];

        for (let move = 0; move < 60; move++) {
            const l = await player.look();
            const anywhere = { x: l.canvas.x + random() * l.canvas.width, y: l.canvas.y + random() * l.canvas.height, onScreen: true, clear: true };
            const roll = random();
            if (roll < 0.35 && l.mode === 'edit') {
                const end = l.openEnds.length > 0 && random() < 0.7 ? pick(l.openEnds).drop[pick(['ahead', 'left', 'right'] as const)] : anywhere;
                player.note(`move ${move}: drag at (${end.x}, ${end.y})`);
                await player.dragPart(pick(parts), end);
            } else if (roll < 0.55) {
                player.note(`move ${move}: click (${anywhere.x.toFixed(0)}, ${anywhere.y.toFixed(0)})`);
                await player.click(anywhere);
            } else if (roll < 0.65) {
                await player.wheel(random() < 0.5 ? 240 : -240);
            } else if (roll < 0.85) {
                const key = pick(['Delete', 'Escape', 'Control+z', 'Control+y', 'Space', 'm', 'f', '1', '3', '+', '-']);
                player.note(`move ${move}: press ${key}`);
                await player.press(key);
            } else {
                const mode = l.mode === 'edit' ? /simulate/i : /edit/i;
                player.note(`move ${move}: switch mode`);
                await player.click(page.getByRole('button', { name: mode }).first());
            }
            const problems = await integrityProblems(page);
            expect(problems, `after move ${move}: ${player.journal.at(-1)}`).toEqual([]);
        }
        player.report('monkey-60', { moves: 60 });
        expect(player.consoleProblems.filter(p => p.startsWith('pageerror') || p.startsWith('error'))).toEqual([]);
    });
});
