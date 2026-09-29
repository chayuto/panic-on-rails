/**
 * The collection: owned boxes and parts, what's on the table, what's left,
 * buying, and the hobby money trains earn.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { countPlacedPieces, inventoryOf, piecesLeft, shortfall, formatMoney } from '../collection';
import { useCollectionStore, STARTER_COLLECTION } from '../../stores/useCollectionStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { earningsFor, ECONOMY } from '../../simulation/economy';
import { resetWorld, loadSetPlan, simHarness, summarize } from '../../simulation/harness';
import type { SimEvent } from '../../simulation/step';

const M1 = 'kato-20-852';

describe('inventoryOf', () => {
    it('adds up the contents of every box and the loose parts', () => {
        const inv = inventoryOf({ [M1]: 2 }, { 'kato-20-000': 3, 'kato-20-202': 1 });
        expect(inv['kato-20-000']).toBe(2 * 4 + 3);
        expect(inv['kato-20-120']).toBe(16);
        expect(inv['kato-20-202']).toBe(1);
    });

    it('ignores unknown sets and empty boxes', () => {
        expect(inventoryOf({ nope: 1, [M1]: 0 }, {})).toEqual({});
    });
});

describe('countPlacedPieces', () => {
    beforeEach(() => resetWorld());

    it('counts a turnout or a crossover as one piece, not its edges', () => {
        const track = useTrackStore.getState();
        track.addTrack('kato-20-000', { x: 0, y: 0 }, 0);
        track.addTrack('kato-20-202', { x: 400, y: 0 }, 0);
        track.addTrack('kato-20-230', { x: 800, y: 0 }, 0);
        track.addTrack('kato-20-320', { x: 1400, y: 0 }, 0);
        expect(countPlacedPieces(useTrackStore.getState().edges)).toEqual({
            'kato-20-000': 1, 'kato-20-202': 1, 'kato-20-230': 1, 'kato-20-320': 1,
        });
    });

    it('counts layouts saved before placement ids by shape', () => {
        const track = useTrackStore.getState();
        track.addTrack('kato-20-202', { x: 0, y: 0 }, 0);
        track.addTrack('kato-20-320', { x: 400, y: 0 }, 0);
        track.addTrack('kato-20-000', { x: 800, y: 0 }, 0);
        const legacy = Object.fromEntries(Object.entries(useTrackStore.getState().edges)
            .map(([id, e]) => [id, { ...e, placementId: undefined }]));
        expect(countPlacedPieces(legacy)).toEqual({ 'kato-20-202': 1, 'kato-20-320': 1, 'kato-20-000': 1 });
    });

    it('updates as pieces come and go: removing an edge removes its whole piece', () => {
        const edgeId = useTrackStore.getState().addTrack('kato-20-202', { x: 0, y: 0 }, 0)!;
        expect(Object.keys(useTrackStore.getState().edges)).toHaveLength(2);
        useTrackStore.getState().removeTrack(edgeId);
        expect(useTrackStore.getState().edges).toEqual({});
        expect(countPlacedPieces(useTrackStore.getState().edges)).toEqual({});
    });
});

describe('piecesLeft and shortfall', () => {
    it('is owned minus on the table, never below zero', () => {
        expect(piecesLeft({ a: 4, b: 1 }, { a: 1, b: 3 })).toEqual({ a: 3, b: 0 });
    });

    it('lists what a plan needs that the collection lacks', () => {
        expect(shortfall({ a: 4, b: 2, c: 1 }, { a: 4, b: 1 })).toEqual({ b: 1, c: 1 });
    });

    it('formats money in dollars', () => {
        expect(formatMoney(9500)).toBe('$95.00');
        expect(formatMoney(-2000)).toBe('−$20.00');
    });
});

describe('useCollectionStore', () => {
    beforeEach(() => useCollectionStore.getState().resetCollection());

    it('starts a new player with an M1 box and pocket money', () => {
        const s = useCollectionStore.getState();
        expect(s.mode).toBe('collection');
        expect(s.ownedSets).toEqual({ [M1]: 1 });
        expect(s.wallet).toBe(STARTER_COLLECTION.wallet);
    });

    it('buys a box when the money is there, and not before', () => {
        const store = useCollectionStore.getState();
        expect(store.buySet('kato-20-864')).toBe(false); // V5 costs more than the pocket money
        store.earn(10_000);
        expect(useCollectionStore.getState().buySet('kato-20-864')).toBe(true);
        const s = useCollectionStore.getState();
        expect(s.ownedSets['kato-20-864']).toBe(1);
        expect(s.wallet).toBe(STARTER_COLLECTION.wallet + 10_000 - 4500);
        expect(s.lifetimeEarned).toBe(10_000);
    });

    it('buys loose parts with a product number, but not box-only pieces', () => {
        const store = useCollectionStore.getState();
        expect(store.buyPart('kato-20-000', 2)).toBe(true);
        expect(useCollectionStore.getState().looseParts['kato-20-000']).toBe(2);
        expect(useCollectionStore.getState().wallet).toBe(STARTER_COLLECTION.wallet - 2 * 210);
        expect(useCollectionStore.getState().buyPart('kato-s60l')).toBe(false);
        expect(useCollectionStore.getState().buyPart('nope')).toBe(false);
    });
});

describe('earnings', () => {
    it('pays per metre of track a train finishes, and bills repairs per crashed train', () => {
        const edges = { e1: { length: 248 }, e2: { length: 124 } } as never;
        const events: SimEvent[] = [
            { type: 'traverse', trainId: 't1', fromEdgeId: 'e1', toEdgeId: 'e2' },
            { type: 'traverse', trainId: 't1', fromEdgeId: 'e2', toEdgeId: 'e1' },
            { type: 'collision', trainId: 't1', otherTrainIds: ['t2'], edgeId: 'e1', location: { x: 0, y: 0 }, severity: 1 },
            { type: 'collision', trainId: 't2', otherTrainIds: ['t1'], edgeId: 'e1', location: { x: 0, y: 0 }, severity: 1 },
        ];
        const { income, repairs } = earningsFor(events, edges);
        expect(income).toBeCloseTo(0.372 * ECONOMY.CENTS_PER_METRE, 6);
        expect(repairs).toBe(2 * ECONOMY.REPAIR_CENTS);
    });

    describe('while running (headless)', () => {
        beforeEach(() => {
            resetWorld();
            simHarness.seed(1);
            useCollectionStore.getState().resetCollection();
        });

        it('a train circling the M1 oval earns hobby money', () => {
            loadSetPlan(M1);
            simHarness.runSeconds(60);
            const earned = useCollectionStore.getState().wallet - STARTER_COLLECTION.wallet;
            // 100 mm/s for 60 s is ~6 m of track, paid per finished edge
            expect(earned).toBeGreaterThan(5 * ECONOMY.CENTS_PER_METRE);
            expect(earned).toBeLessThanOrEqual(6 * ECONOMY.CENTS_PER_METRE + 1);
            expect(summarize().crashed).toBe(0);
        });

        it('free build earns nothing', () => {
            useCollectionStore.getState().setMode('free');
            loadSetPlan(M1);
            simHarness.runSeconds(30);
            expect(useCollectionStore.getState().wallet).toBe(STARTER_COLLECTION.wallet);
        });
    });
});
