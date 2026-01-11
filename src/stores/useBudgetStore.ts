/**
 * Budget Store for PanicOnRails
 * 
 * Manages player budget for buying track pieces.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
// ===========================

interface BudgetActions {

    /**
     * Attempt to spend a specific amount from the budget.
     * 
     * @param amount - Amount to spend in cents
     * @returns `true` if transaction successful, `false` if insufficient funds
     * 
     * @example
     * if (spend(500)) {
     *   console.log('Bought item!');
     * } else {
     *   console.log('Not enough money');
     * }
     */
    spend: (amount: number) => boolean;

    /**
     * Refund an amount back to the budget balance.
     * 
     * @param amount - Amount to refund in cents
     * 
     * @example
     * refund(500); // Balance increases by $5.00
     */
    refund: (amount: number) => void;

    /**
     * Reset budget to the starting amount and clear total spent.
     * 
     * @example
     * reset(); // Balance becomes startingBudget ($100.00)
     */
    reset: () => void;

    /**
     * Set the starting budget for the session.
     * Also resets current balance to this new amount.
     * 
     * @param amount - New starting budget in cents
     * 
     * @example
     * setStartingBudget(20000); // Set to $200.00
     */
    setStartingBudget: (amount: number) => void;

    /**
     * Check if the user can afford a specific amount without spending it.
     * 
     * @param amount - Amount to check in cents
     * @returns `true` if balance >= amount
     * 
     * @example
     * if (canAfford(1000)) { ... }
     */
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
        immer((set, get) => ({
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

                set((state) => {
                    state.balance -= amount;
                    state.totalSpent += amount;
                });

                console.log('[BudgetStore] Spent:', {
                    amount: `$${(amount / 100).toFixed(2)}`,
                    remaining: `$${((get().balance) / 100).toFixed(2)}`,
                });

                return true;
            },

            refund: (amount: number) => {
                set((state) => {
                    state.balance += amount;
                    state.totalSpent = Math.max(0, state.totalSpent - amount);
                });

                console.log('[BudgetStore] Refunded:', {
                    amount: `$${(amount / 100).toFixed(2)}`,
                    newBalance: `$${(get().balance / 100).toFixed(2)}`,
                });
            },

            reset: () => {
                const { startingBudget } = get();
                set((state) => {
                    state.balance = startingBudget;
                    state.totalSpent = 0;
                });
                console.log('[BudgetStore] Reset to:', `$${(startingBudget / 100).toFixed(2)}`);
            },

            setStartingBudget: (amount: number) => {
                set((state) => {
                    state.startingBudget = amount;
                    state.balance = amount;
                    state.totalSpent = 0;
                });
            },

            canAfford: (amount: number) => {
                return get().balance >= amount;
            },
        })),
        {
            name: 'panic-on-rails-budget-v1',
        }
    )
);

// ===========================
// Named Selectors
// ===========================

export const selectBalance = (state: BudgetState) => state.balance;
export const selectTotalSpent = (state: BudgetState) => state.totalSpent;
export const selectStartingBudget = (state: BudgetState) => state.startingBudget;
export const selectCanAfford = (state: BudgetState & BudgetActions) => state.canAfford;

// ===========================
// Utility Functions
// ===========================

/** Format cents as dollar string */
export function formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}
