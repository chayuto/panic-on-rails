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
import fc from 'fast-check';
import { Player } from '../helpers/player';
import type { QaLook } from '../../src/utils/qaLens';

const M1 = 'kato-20-852';

/** What the monkey plays on: the page, through a player. */
interface Monkey {
    page: Page;
    player: Player;
}
type Move = fc.AsyncCommand<object, Monkey>;

/** Somewhere on the canvas, as a fraction of its width and height. */
const somewhere = fc.record({ fx: fc.double({ min: 0, max: 1, noNaN: true }), fy: fc.double({ min: 0, max: 1, noNaN: true }) });
const onCanvas = (l: QaLook, { fx, fy }: { fx: number; fy: number }) =>
    ({ x: l.canvas.x + fx * l.canvas.width, y: l.canvas.y + fy * l.canvas.height, onScreen: true, clear: true });

/** After each move: the track is whole. */
async function stillWhole(page: Page, move: Move): Promise<void> {
    expect(await integrityProblems(page), `after ${move.toString()}`).toEqual([]);
}

class DragPart implements Move {
    constructor(readonly part: string, readonly end: number | null, readonly side: 'ahead' | 'left' | 'right', readonly at: { fx: number; fy: number }) {}
    check = () => true;
    async run(_model: object, { page, player }: Monkey) {
        const l = await player.look();
        // A monkey only drags track while building
        if (l.mode !== 'edit') return;
        const to = this.end !== null && l.openEnds.length > 0 ? l.openEnds[this.end % l.openEnds.length].drop[this.side] : onCanvas(l, this.at);
        await player.dragPart(this.part, to);
        await stillWhole(page, this);
    }
    toString = () => `drag ${this.part} to ${this.end === null ? `(${this.at.fx.toFixed(2)}, ${this.at.fy.toFixed(2)})` : `open end ${this.end}, ${this.side}`}`;
}

class Click implements Move {
    constructor(readonly at: { fx: number; fy: number }) {}
    check = () => true;
    async run(_model: object, { page, player }: Monkey) {
        await player.click(onCanvas(await player.look(), this.at), { aimed: false });
        await stillWhole(page, this);
    }
    toString = () => `click (${this.at.fx.toFixed(2)}, ${this.at.fy.toFixed(2)})`;
}

class Wheel implements Move {
    constructor(readonly deltaY: number) {}
    check = () => true;
    async run(_model: object, { page, player }: Monkey) {
        await player.wheel(this.deltaY);
        await stillWhole(page, this);
    }
    toString = () => `wheel ${this.deltaY}`;
}

class Press implements Move {
    constructor(readonly key: string) {}
    check = () => true;
    async run(_model: object, { page, player }: Monkey) {
        await player.press(this.key);
        await stillWhole(page, this);
    }
    toString = () => `press ${this.key}`;
}

class SwitchMode implements Move {
    check = () => true;
    async run(_model: object, { page, player }: Monkey) {
        const l = await player.look();
        await player.click(page.getByRole('button', { name: l.mode === 'edit' ? /simulate/i : /edit/i }).first());
        await stillWhole(page, this);
    }
    toString = () => 'switch mode';
}

/** The monkey's moves: mostly building, then clicks and keys, sometimes a wheel or a mode switch. */
const MONKEY_MOVE: fc.Arbitrary<Move> = fc.oneof(
    {
        weight: 35,
        arbitrary: fc.tuple(
            fc.constantFrom('Straight 248mm', 'Curve R315-45°', 'Straight 124mm'),
            // Mostly at an open end, as a player builds; now and then anywhere
            fc.option(fc.nat(50), { freq: 3 }),
            fc.constantFrom('ahead' as const, 'left' as const, 'right' as const),
            somewhere,
        ).map(([part, end, side, at]) => new DragPart(part, end, side, at)),
    },
    { weight: 20, arbitrary: somewhere.map(at => new Click(at)) },
    { weight: 10, arbitrary: fc.constantFrom(240, -240).map(delta => new Wheel(delta)) },
    { weight: 20, arbitrary: fc.constantFrom('Delete', 'Escape', 'Control+z', 'Control+y', 'Space', 'm', 'f', '1', '3', '+', '-').map(key => new Press(key)) },
    { weight: 15, arbitrary: fc.constant(new SwitchMode()) },
);
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
        for (const [i, label] of plan.entries()) {
            if (i === 0) continue;
            // Hover right of the end for the first curve of a bend; after that, a
            // curve dropped straight on keeps turning the same way
            const firstOfBend = label.startsWith('Curve') && !plan[i - 1].startsWith('Curve');
            const drop = await player.bringIntoView(l => l.openEnds.at(-1)?.drop[firstOfBend ? 'right' : 'ahead']);
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
        // The view follows the build, and nothing lies over the track
        expect(metrics.recoveries, 'zooming out because the track ran off screen or under a button').toBe(0);
        expect(metrics.obstructions, 'a button or hint in the way').toBe(0);
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
            // Every button big enough to hit at the zoom that fits the layout
            const tiny = (await player.look()).points.filter(p => p.size < 12).map(p => `${p.part}: ${p.size}px`);
            expect(tiny, 'points buttons under 12px across').toEqual([]);
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
            // Hints and toasts let clicks through to the layout
            expect(metrics.obstructions).toBe(0);
            expect(player.consoleProblems).toEqual([]);
        });
    }

    /**
     * A monkey plays: random drags, clicks, wheels, keys and mode switches,
     * as fast-check commands (`fc.commands`). After every move the track must
     * be whole, and at the end nothing may have errored. A failure shrinks to
     * the shortest run of moves that still breaks, and fast-check prints the
     * seed and path to replay it: pass them to `fc.assert` as `{ seed, path }`.
     */
    test('a monkey plays: no errors, the track stays whole', async ({ page, app }) => {
        void app;
        test.setTimeout(300_000);
        const player = new Player(page);
        let played = 0;
        await fc.assert(
            fc.asyncProperty(fc.commands([MONKEY_MOVE], { maxCommands: 60, size: 'max' }), async moves => {
                const before = player.consoleProblems.length;
                await fc.asyncModelRun(() => ({ model: {}, real: { page, player } }), moves);
                played += [...moves].length;
                const problems = player.consoleProblems.slice(before).filter(p => p.startsWith('pageerror') || p.startsWith('error'));
                expect(problems).toEqual([]);
            }).beforeEach(async () => {
                // Each run, and each shrink, starts from a fresh page
                await page.evaluate(() => localStorage.clear());
                await page.reload();
                await expect(page.getByTestId('app')).toBeVisible();
            }),
            { numRuns: 2 }
        );
        player.report('monkey', { moves: played });
    });
});
