/**
 * Budget Store for PanicOnRails
 * 
 * Manages player budget for buying track pieces.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ===========================
// State Interface
// ===========================

interface BudgetState {
    /** Current available balance (in cents) */
    balance: number;
    /** Total amount spent (in cents) */
    totalSpent: number;
    /** Starting budget for this session (in cents) */
    startingBudget: number;
}

// ===========================
// Actions Interface
// ===========================

interface BudgetActions {
    /** Attempt to spend amount. Returns false if insufficient funds. */
    spend: (amount: number) => boolean;
    /** Refund an amount back to balance */
    refund: (amount: number) => void;
    /** Reset budget to starting amount */
    reset: () => void;
    /** Set a new starting budget */
    setStartingBudget: (amount: number) => void;
    /** Check if can afford an amount */
    canAfford: (amount: number) => boolean;
}

// ===========================
// Default Values
// ===========================

/** Default starting budget: $100 (10000 cents) */
const DEFAULT_STARTING_BUDGET = 10000;

const initialState: BudgetState = {
    balance: DEFAULT_STARTING_BUDGET,
    totalSpent: 0,
    startingBudget: DEFAULT_STARTING_BUDGET,
};

// ===========================
// Store Implementation
// ===========================

export const useBudgetStore = create<BudgetState & BudgetActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            spend: (amount: number) => {
                const { balance } = get();
                if (amount > balance) {
                    console.warn('[BudgetStore] Insufficient funds:', {
                        requested: amount,
                        available: balance
                    });
                    return false;
                }

                set((state) => ({
                    balance: state.balance - amount,
                    totalSpent: state.totalSpent + amount,
                }));

                console.log('[BudgetStore] Spent:', {
                    amount: `$${(amount / 100).toFixed(2)}`,
                    remaining: `$${((get().balance) / 100).toFixed(2)}`,
                });

                return true;
            },

            refund: (amount: number) => {
                set((state) => ({
                    balance: state.balance + amount,
                    totalSpent: Math.max(0, state.totalSpent - amount),
                }));

                console.log('[BudgetStore] Refunded:', {
                    amount: `$${(amount / 100).toFixed(2)}`,
                    newBalance: `$${(get().balance / 100).toFixed(2)}`,
                });
            },

            reset: () => {
                const { startingBudget } = get();
                set({
                    balance: startingBudget,
                    totalSpent: 0,
                });
                console.log('[BudgetStore] Reset to:', `$${(startingBudget / 100).toFixed(2)}`);
            },

            setStartingBudget: (amount: number) => {
                set({
                    startingBudget: amount,
                    balance: amount,
                    totalSpent: 0,
                });
            },

            canAfford: (amount: number) => {
                return get().balance >= amount;
            },
        }),
        {
            name: 'panic-on-rails-budget-v1',
        }
    )
);

// ===========================
// Utility Functions
// ===========================

/** Format cents as dollar string */
export function formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}
