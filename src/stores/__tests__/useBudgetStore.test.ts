import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBudgetStore } from '../useBudgetStore';

describe('useBudgetStore', () => {
    // Reset store before each test
    beforeEach(() => {
        const { reset, setStartingBudget } = useBudgetStore.getState();
        setStartingBudget(10000); // Set default to $100.00
        reset();
    });

    it('should initialize with default budget', () => {
        const { balance, totalSpent } = useBudgetStore.getState();
        expect(balance).toBe(10000);
        expect(totalSpent).toBe(0);
    });

    it('should spend money correctly', () => {
        const { spend } = useBudgetStore.getState();
        const success = spend(500); // Spend $5.00

        const { balance, totalSpent } = useBudgetStore.getState();
        expect(success).toBe(true);
        expect(balance).toBe(9500);
        expect(totalSpent).toBe(500);
    });

    it('should reject spending more than balance', () => {
        const { spend } = useBudgetStore.getState();
        const success = spend(15000); // Try to spend $150.00 (fail)

        const { balance, totalSpent } = useBudgetStore.getState();
        expect(success).toBe(false);
        expect(balance).toBe(10000);
        expect(totalSpent).toBe(0);
    });

    it('should refund money correctly', () => {
        const { spend, refund } = useBudgetStore.getState();
        spend(1000); // Spend $10.00
        refund(500); // Refund $5.00

        const { balance, totalSpent } = useBudgetStore.getState();
        expect(balance).toBe(9500);
        expect(totalSpent).toBe(500);
    });

    it('should reset budget to starting amount', () => {
        const { spend, reset } = useBudgetStore.getState();
        spend(5000);
        reset();

        const { balance, totalSpent } = useBudgetStore.getState();
        expect(balance).toBe(10000);
        expect(totalSpent).toBe(0);
    });

    it('should update starting budget', () => {
        const { setStartingBudget } = useBudgetStore.getState();
        setStartingBudget(20000); // Set to $200.00

        const { balance, startingBudget } = useBudgetStore.getState();
        expect(startingBudget).toBe(20000);
        expect(balance).toBe(20000);
    });

    it('should check affordability correctly', () => {
        const { canAfford } = useBudgetStore.getState();
        expect(canAfford(5000)).toBe(true);
        expect(canAfford(15000)).toBe(false);
    });
});
