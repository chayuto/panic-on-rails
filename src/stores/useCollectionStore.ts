/**
 * Collection store: the player's hobby. Which boxes and loose parts they
 * own, their hobby money, and whether they're playing with their
 * collection or free-building with unlimited parts.
 *
 * Purchases are real transactions: they are not part of undo history.
 * What's left to build with is derived (see `src/data/collection.ts`).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSetById } from '../data/sets';
import { getPartById } from '../data/catalog';

export type CollectionMode = 'collection' | 'free';

/** What a new player starts with: an M1 box and a little pocket money. */
export const STARTER_COLLECTION = {
    ownedSets: { 'kato-20-852': 1 } as Record<string, number>,
    wallet: 2000,
};

interface CollectionState {
    /** 'collection': build with what you own and earn money. 'free': unlimited parts. */
    mode: CollectionMode;
    /** Hobby money, US cents. Can dip below zero after crash repairs. */
    wallet: number;
    /** Everything ever earned, US cents */
    lifetimeEarned: number;
    /** Boxes owned: set id → count */
    ownedSets: Record<string, number>;
    /** Parts bought on their own: part id → count */
    looseParts: Record<string, number>;
}

interface CollectionActions {
    setMode: (mode: CollectionMode) => void;
    /** Add (or, if negative, take) hobby money. Income counts toward lifetime earnings. */
    earn: (cents: number) => void;
    /** Buy a boxed set. False if it's unknown, unpriced or too expensive. */
    buySet: (setId: string) => boolean;
    /** Buy loose pieces of a part. False if it's unknown, not sold alone or too expensive. */
    buyPart: (partId: string, qty?: number) => boolean;
    /** Start over with the starter collection. */
    resetCollection: () => void;
}

export type CollectionStore = CollectionState & CollectionActions;

const initialState: CollectionState = {
    mode: 'collection',
    wallet: STARTER_COLLECTION.wallet,
    lifetimeEarned: 0,
    ownedSets: { ...STARTER_COLLECTION.ownedSets },
    looseParts: {},
};

export const useCollectionStore = create<CollectionStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            setMode: (mode) => set({ mode }),

            earn: (cents) => {
                if (cents === 0) return;
                set(s => ({
                    wallet: s.wallet + cents,
                    lifetimeEarned: s.lifetimeEarned + Math.max(0, cents),
                }));
            },

            buySet: (setId) => {
                const box = getSetById(setId);
                const price = box?.price;
                if (!box || price === undefined || get().wallet < price) return false;
                set(s => ({
                    wallet: s.wallet - price,
                    ownedSets: { ...s.ownedSets, [setId]: (s.ownedSets[setId] ?? 0) + 1 },
                }));
                return true;
            },

            buyPart: (partId, qty = 1) => {
                const part = getPartById(partId);
                // Pieces without their own product number only come in boxes
                if (!part?.productCode || qty <= 0) return false;
                const total = part.cost * qty;
                if (get().wallet < total) return false;
                set(s => ({
                    wallet: s.wallet - total,
                    looseParts: { ...s.looseParts, [partId]: (s.looseParts[partId] ?? 0) + qty },
                }));
                return true;
            },

            resetCollection: () => set({
                ...initialState,
                ownedSets: { ...STARTER_COLLECTION.ownedSets },
                looseParts: {},
            }),
        }),
        { name: 'panic-on-rails-collection-v1' }
    )
);

export const selectMode = (s: CollectionStore) => s.mode;
export const selectWallet = (s: CollectionStore) => s.wallet;
export const selectOwnedSets = (s: CollectionStore) => s.ownedSets;
export const selectLooseParts = (s: CollectionStore) => s.looseParts;
