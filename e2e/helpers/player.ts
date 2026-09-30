/**
 * A player: plays with the mouse and keyboard only, and sees the canvas
 * through `window.__PANIC_QA__.look()`. It never writes to the game's
 * stores; the one exception is letting time pass (`waitSimSeconds`), which
 * no player action can do faster.
 *
 * Every action is counted, and an action that changes nothing on screen is
 * counted as a miss, so a playtest reports how hard a goal was, not only
 * whether it was reached. Console errors and warnings are collected too.
 */

import type { Locator, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { QaLook } from '../../src/utils/qaLens';

export type PagePoint = QaLook['openEnds'][number]['at'];

export interface PlaytestMetrics {
    actions: number;
    drags: number;
    clicks: number;
    wheels: number;
    keys: number;
    /** Actions that changed nothing the player could see */
    misses: number;
    /** Zooming or panning to bring something back on screen */
    recoveries: number;
    /** Times a hint, toast or button covered what the player wanted to reach */
    obstructions: number;
    /** Simulated seconds the player waited */
    waitedSimSeconds: number;
}

export class Player {
    readonly metrics: PlaytestMetrics = { actions: 0, drags: 0, clicks: 0, wheels: 0, keys: 0, misses: 0, recoveries: 0, obstructions: 0, waitedSimSeconds: 0 };
    readonly consoleProblems: string[] = [];
    readonly journal: string[] = [];
    private readonly startedAt = Date.now();

    constructor(private readonly page: Page) {
        page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning') this.consoleProblems.push(`${msg.type()}: ${msg.text()}`);
        });
        page.on('pageerror', err => this.consoleProblems.push(`pageerror: ${err.message}`));
    }

    look(): Promise<QaLook> {
        return this.page.evaluate(() => window.__PANIC_QA__!.look());
    }

    note(text: string): void {
        this.journal.push(`${((Date.now() - this.startedAt) / 1000).toFixed(1)}s · ${this.metrics.actions} actions · ${text}`);
    }

    /**
     * What a player can see change: the pieces, points and trains, the mode,
     * the money, dialogs, hints, the selection and the view.
     */
    private async fingerprint(): Promise<string> {
        const l = await this.look();
        return JSON.stringify([
            l.mode, l.running, l.wallet, l.dialogs, l.hints, l.selected, l.canvas.zoom,
            l.pieces.length, l.openEnds.length, l.points.map(p => p.set), l.trains.length,
        ]);
    }

    private async counted<T>(kind: 'drags' | 'clicks' | 'wheels' | 'keys', act: () => Promise<T>): Promise<boolean> {
        const before = await this.fingerprint();
        await act();
        this.metrics[kind]++;
        this.metrics.actions++;
        // Give the app up to a few frames to respond before calling it a miss
        let changed = false;
        for (let i = 0; i < 6 && !changed; i++) {
            await this.page.waitForTimeout(40);
            changed = (await this.fingerprint()) !== before;
        }
        if (!changed) this.metrics.misses++;
        return changed;
    }

    /** Drag a part card from the parts bin and drop it at a point on the page. */
    async dragPart(label: string, to: PagePoint): Promise<boolean> {
        const canvas = this.page.locator('.konvajs-content');
        const box = (await canvas.boundingBox())!;
        const placed = await this.counted('drags', () =>
            this.page.getByTestId('parts-bin').getByText(label, { exact: true }).first().dragTo(canvas, {
                targetPosition: { x: to.x - box.x, y: to.y - box.y },
                force: true,
            }));
        if (!placed) this.note(`dropped ${label} at (${to.x}, ${to.y}): nothing placed`);
        return placed;
    }

    /**
     * Click a button or a point on the canvas. On the canvas, first give it
     * the moment a person would: Konva redraws what can be clicked a frame
     * after anything changes.
     */
    async click(target: Locator | PagePoint): Promise<boolean> {
        if ('x' in target) {
            await this.waitForHitTarget(target);
            // A toast can pop up over the spot just before the click lands
            if (!(await this.reachesCanvas(target))) {
                this.metrics.obstructions++;
                this.note(`(${target.x}, ${target.y}) was covered as the player went to click`);
                await this.dismissOverlays();
            }
        }
        return this.counted('clicks', async () => {
            if ('x' in target) await this.page.mouse.click(target.x, target.y);
            else await target.click();
        });
    }

    private reachesCanvas(point: PagePoint): Promise<boolean> {
        return this.page.evaluate(({ x, y }) => {
            const top = document.elementFromPoint(x, y);
            return !!top && !!document.querySelector('[data-testid="canvas-container"]')?.contains(top);
        }, point);
    }

    private async waitForHitTarget(point: PagePoint): Promise<void> {
        const hittable = () => this.page.evaluate(({ x, y }) => {
            const rect = document.querySelector('[data-testid="canvas-container"]')!.getBoundingClientRect();
            return !!window.__PANIC_STAGE__?.getIntersection({ x: x - rect.left, y: y - rect.top });
        }, point);
        for (let i = 0; i < 20 && !(await hittable()); i++) await this.page.waitForTimeout(50);
    }

    /**
     * Close the onboarding hints and toasts lying over the canvas, the way a
     * player clears them out of the way. Returns how many were closed.
     */
    async dismissOverlays(): Promise<number> {
        const buttons = this.page.locator('.onboarding-toast__dismiss, .onboarding-hint__dismiss');
        const count = await buttons.count();
        for (let i = count - 1; i >= 0; i--) {
            await buttons.nth(i).click();
            this.metrics.clicks++;
            this.metrics.actions++;
        }
        if (count > 0) this.note(`closed ${count} hint${count > 1 ? 's' : ''} over the canvas`);
        return count;
    }

    async press(key: string): Promise<boolean> {
        return this.counted('keys', () => this.page.keyboard.press(key));
    }

    /** Scroll the wheel over the middle of the canvas: positive zooms out. */
    async wheel(deltaY: number): Promise<void> {
        const l = await this.look();
        await this.page.mouse.move(l.canvas.x + l.canvas.width / 2, l.canvas.y + l.canvas.height / 2);
        await this.page.mouse.wheel(0, deltaY);
        this.metrics.wheels++;
        this.metrics.actions++;
        await this.page.waitForTimeout(80);
    }

    /**
     * Zoom out until `pick` finds a point the player can reach: on screen and
     * not under a button or hint. That's what a player does when the track
     * runs off the edge. Returns the point, or null if it never comes clear.
     */
    async bringIntoView(pick: (l: QaLook) => PagePoint | undefined, maxTries = 10): Promise<PagePoint | null> {
        for (let tries = 0; tries <= maxTries; tries++) {
            const point = pick(await this.look());
            if (point?.clear) return point;
            if (point?.onScreen) {
                this.metrics.obstructions++;
                this.note(`(${point.x}, ${point.y}) is covered: zooming out`);
            }
            if (tries === maxTries) break;
            await this.wheel(240);
            this.metrics.recoveries++;
        }
        return null;
    }

    /** Let `seconds` of game time pass, with the trains running. */
    async waitSimSeconds(seconds: number): Promise<void> {
        await this.page.evaluate(s => {
            window.__PANIC_STORES__!.simulation.setRunning(false);
            window.__PANIC_SIM__!.runSeconds(s);
            window.__PANIC_STORES__!.simulation.setRunning(true);
        }, seconds);
        this.metrics.waitedSimSeconds += seconds;
    }

    /** Write the playtest's metrics and journal to `e2e-results/playtest/<name>.json`. */
    report(name: string, outcome: Record<string, unknown>): { metrics: PlaytestMetrics; seconds: number } {
        const seconds = (Date.now() - this.startedAt) / 1000;
        const dir = 'e2e-results/playtest';
        mkdirSync(dir, { recursive: true });
        writeFileSync(`${dir}/${name}.json`, JSON.stringify({
            name,
            outcome,
            metrics: this.metrics,
            seconds,
            consoleProblems: this.consoleProblems,
            journal: this.journal,
        }, null, 2));
        return { metrics: this.metrics, seconds };
    }
}
