/**
 * Sharing a layout by link: the pieces go into a code and come back out,
 * and the layout they build is the one that was shared.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    layoutPieces, encodeLayout, decodeLayout, sharedLayoutTemplate, shareUrl, layoutCodeIn, SharedLayoutError,
} from '../shareLayout';
import { resetWorld, loadRecipe, loadSetPlan } from '../../simulation/harness';
import { useTrackStore } from '../../stores/useTrackStore';
import { countPlacedPieces } from '../../data/collection';
import { isOpenEnd } from '../graphAnalysis';

/** What a layout is, for comparing two: its pieces, joints and ends. */
function snapshot() {
    const { nodes, edges } = useTrackStore.getState();
    return {
        pieces: countPlacedPieces(edges),
        edges: Object.keys(edges).length,
        nodes: Object.keys(nodes).length,
        openEnds: Object.values(nodes).filter(isOpenEnd).length,
        points: Object.values(nodes).filter(n => n.type === 'switch').length,
    };
}

/** Every node of the layout on the table. */
function nodePositions() {
    return Object.values(useTrackStore.getState().nodes).map(n => n.position);
}

describe('sharing a layout by link', () => {
    beforeEach(() => resetWorld());

    it.each([
        ['Kato M1', 'kato-20-852'],
        ['Kato V7, with the WX310', 'kato-20-866'],
        ['Märklin C3, with curved turnouts', 'marklin-24903'],
        ['Märklin C5, with the double slip', 'marklin-24905'],
        ['Hornby Pack F, with the level crossing', 'hornby-R8226'],
    ])('%s comes back exactly as it was shared', async (_name, setId) => {
        loadSetPlan(setId);
        const before = snapshot();
        const positions = nodePositions();
        const { edges, nodes } = useTrackStore.getState();
        const code = await encodeLayout(layoutPieces(edges, nodes));

        resetWorld();
        loadRecipe(sharedLayoutTemplate(await decodeLayout(code)));
        expect(snapshot()).toEqual(before);
        // Every node where it was. A joint's own node can sit anywhere in its
        // play (Pack F's crossing joint is 0.4mm), depending on which piece
        // was built first
        const after = nodePositions();
        for (const p of positions) {
            const nearest = Math.min(...after.map(q => Math.hypot(q.x - p.x, q.y - p.y)));
            expect(nearest).toBeLessThan(0.5);
        }
    });

    it('recovers a piece placed anywhere, at any angle', () => {
        useTrackStore.getState().addTrack('kato-20-202', { x: 123.45, y: -67.8 }, 217.5); // #6 turnout
        useTrackStore.getState().addTrack('marklin-24671', { x: -500, y: 40 }, 33.25);     // curved turnout
        const { edges, nodes } = useTrackStore.getState();
        expect(layoutPieces(edges, nodes)).toEqual([
            { partId: 'kato-20-202', position: { x: 123.45, y: -67.8 }, rotation: 217.5 },
            { partId: 'marklin-24671', position: { x: -500, y: 40 }, rotation: 33.25 },
        ]);
    });

    it('fits a big layout in a link of a reasonable length', async () => {
        loadSetPlan('hornby-R8226'); // 55 pieces
        const { edges, nodes } = useTrackStore.getState();
        const url = shareUrl(await encodeLayout(layoutPieces(edges, nodes)), { origin: 'https://example.com', pathname: '/panic-on-rails/' });
        expect(url.length).toBeLessThan(1500);
        expect(layoutCodeIn(new URL(url).hash)).toMatch(/^v1\./);
    });

    it('says what went wrong with a link it can\'t read', async () => {
        await expect(decodeLayout('v0.abc')).rejects.toThrow(SharedLayoutError);
        await expect(decodeLayout('v1.not-deflate')).rejects.toThrow(/damaged/);
        const code = await encodeLayout([{ partId: 'kato-20-000', position: { x: 0, y: 0 }, rotation: 0 }]);
        const withUnknownPart = await encodeLayout([{ partId: 'kato-99-999', position: { x: 0, y: 0 }, rotation: 0 }]);
        await expect(decodeLayout(code)).resolves.toHaveLength(1);
        await expect(decodeLayout(withUnknownPart)).rejects.toThrow(/kato-99-999/);
    });

    it('finds the code in a page fragment', () => {
        expect(layoutCodeIn('#layout=v1.abc')).toBe('v1.abc');
        expect(layoutCodeIn('#other=1&layout=v1.x_y-z')).toBe('v1.x_y-z');
        expect(layoutCodeIn('')).toBeNull();
    });
});
