/**
 * Whether the hobby shop (the train sets shelf) is open, and on which tab.
 * Non-persisted UI state, so the parts bin, wallet and toolbar can all
 * open it.
 */

import { create } from 'zustand';

export type ShopTab = 'sets' | 'parts' | 'trains';

interface ShopState {
    open: boolean;
    tab: ShopTab;
    openShop: (tab?: ShopTab) => void;
    closeShop: () => void;
    setTab: (tab: ShopTab) => void;
}

export const useShopStore = create<ShopState>()((set) => ({
    open: false,
    tab: 'sets',
    openShop: (tab) => set(s => ({ open: true, tab: tab ?? s.tab })),
    closeShop: () => set({ open: false }),
    setTab: (tab) => set({ tab }),
}));
