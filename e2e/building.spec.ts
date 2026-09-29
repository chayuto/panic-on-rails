/**
 * Building by hand — real HTML5 drag-and-drop from the parts bin, the way a
 * player builds. (Most other specs place track through the store bridge,
 * which bypasses the ghost/snap pipeline this spec covers.)
 */

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/app-fixture.js';

const CURVE = 'Curve R216-45°';

async function dropPart(page: Page, label: string, screen: { x: number; y: number }) {
    await page.getByText(label, { exact: true }).dragTo(page.locator('.konvajs-content'), {
        targetPosition: screen,
        force: true,
    });
}

/**
 * Screen point just ahead of the newest open endpoint, offset to one side.
 * side = +1 hovers to the right of the endpoint's facade, -1 to the left,
 * 0 straight ahead (a turnout then joins by its entry).
 */
async function nearNewestEndpoint(page: Page, side: 1 | 0 | -1) {
    return page.evaluate((side) => {
        const s = window.__PANIC_STORES__!;
        const { zoom, pan } = s.editor.getState();
        const open = Object.values(s.track.getState().nodes).filter(n => n.connections.length === 1);
        const node = open[open.length - 1];
        const r = (node.rotation * Math.PI) / 180;
        const fx = Math.cos(r), fy = Math.sin(r);
        const wx = node.position.x + fx * 8 - fy * 6 * side;
        const wy = node.position.y + fy * 8 + fx * 6 * side;
        return { x: wx * zoom + pan.x, y: wy * zoom + pan.y };
    }, side);
}

/** Graph problems: edges ending at missing nodes, nodes listing missing edges. */
async function integrityProblems(page: Page) {
    return page.evaluate(() => {
        const { nodes, edges } = window.__PANIC_STORES__!.track.getState();
        const problems: string[] = [];
        for (const e of Object.values(edges)) {
            for (const id of [e.startNodeId, e.endNodeId]) {
                if (!nodes[id]?.connections.includes(e.id)) problems.push(`${e.partId} edge ${e.id.slice(0, 6)} → node ${id.slice(0, 6)}`);
            }
        }
        for (const n of Object.values(nodes)) {
            for (const id of n.connections) if (!edges[id]) problems.push(`node ${n.id.slice(0, 6)} → missing edge`);
        }
        return problems;
    });
}

async function trackSummary(page: Page) {
    return page.evaluate(() => {
        const nodes = Object.values(window.__PANIC_STORES__!.track.getState().nodes);
        return {
            edges: Object.keys(window.__PANIC_STORES__!.track.getState().edges).length,
            open: nodes.filter(n => n.connections.length === 1).length,
        };
    });
}

test.describe('Building by hand', () => {
    // Building mechanics with any part: free build, not the starter collection
    test.beforeEach(async ({ page, app }) => {
        void app;
        await page.getByTestId('mode-free').click();
    });

    test('crossings and crossovers can be dragged from the bin', async ({ page, app }) => {
        void app;
        await dropPart(page, '90° Crossing 124mm', { x: 300, y: 200 });
        expect((await trackSummary(page)).edges).toBe(2);
        // Each track: a #4 turnout (two routes) + S60 + S62, i.e. 4 edges a track
        await dropPart(page, '#4 Single Crossover Left', { x: 300, y: 450 });
        expect((await trackSummary(page)).edges).toBe(10);
    });

    test('eight curves dragged end to end close a loop', async ({ page, app }) => {
        void app;
        // A R216 loop is ~432px tall and grows downward from the first piece
        await dropPart(page, CURVE, { x: 500, y: 110 });
        for (let i = 0; i < 7; i++) {
            await dropPart(page, CURVE, await nearNewestEndpoint(page, 1));
        }
        expect(await trackSummary(page)).toEqual({ edges: 8, open: 0 });
    });

    for (const [name, side] of [['right', 1], ['left', -1]] as const) {
        test(`hovering to the ${name} of an endpoint makes the next curve turn ${name}`, async ({ page, app }) => {
            void app;
            await dropPart(page, CURVE, { x: 400, y: 300 });
            await dropPart(page, CURVE, await nearNewestEndpoint(page, side));

            const turn = await page.evaluate(() => {
                const nodes = Object.values(window.__PANIC_STORES__!.track.getState().nodes);
                const joint = nodes.find(n => n.connections.length === 2)!;
                const open = nodes.filter(n => n.connections.length === 1);
                const far = open[open.length - 1];
                // Direction of travel through the joint is opposite its facade
                // for the piece we came from, i.e. along the new piece.
                const r = (joint.rotation * Math.PI) / 180;
                const ax = Math.cos(r), ay = Math.sin(r);
                const dx = far.position.x - joint.position.x, dy = far.position.y - joint.position.y;
                // Screen coords (+Y down): positive cross = clockwise = right
                const cross = ax * dy - ay * dx;
                const ahead = ax * dx + ay * dy;
                return { cross, ahead };
            });
            // The joint facade may face either way along the track, so compare
            // the side relative to whichever way the new piece extends.
            expect(Math.sign(turn.cross * Math.sign(turn.ahead))).toBe(side);
        });
    }

    test('a turnout dropped onto a track end joins at its points and keeps them', async ({ page, app }) => {
        void app;
        await dropPart(page, 'Straight 248mm', { x: 300, y: 300 });
        await dropPart(page, '#6 Turnout Left', await nearNewestEndpoint(page, 0));
        const points = await page.evaluate(() => Object.values(window.__PANIC_STORES__!.track.getState().nodes)
            .filter(n => n.type === 'switch').map(n => n.connections.length));
        // Main, branch and the straight it was dropped on
        expect(points).toEqual([3]);
        expect(await integrityProblems(page)).toEqual([]);
    });

    test('a curve dropped on a straight continues forward instead of folding back', async ({ page, app }) => {
        void app;
        await dropPart(page, 'Straight 248mm', { x: 200, y: 350 });
        await dropPart(page, CURVE, await nearNewestEndpoint(page, 1));

        const result = await page.evaluate(() => {
            const { nodes } = window.__PANIC_STORES__!.track.getState();
            const xs = Object.values(nodes).map(n => n.position.x);
            const joined = Object.values(nodes).filter(n => n.connections.length === 2).length;
            return { maxX: Math.max(...xs), straightEndX: [...xs].sort((a, b) => a - b)[1], joined };
        });
        expect(result.joined).toBe(1);
        // The curve's far end lies beyond the joint, not back over the straight
        expect(result.maxX).toBeGreaterThan(result.straightEndX + 50);
    });
});
