/**
 * Vitest Setup File
 * 
 * This file runs before all tests to set up the test environment.
 * It mocks browser APIs that don't exist in Node.js.
 */

// ===========================
// Mock localStorage for Zustand persist middleware
// ===========================

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string): string | null => store[key] || null,
        setItem: (key: string, value: string): void => { store[key] = value; },
        removeItem: (key: string): void => { delete store[key]; },
        clear: (): void => { store = {}; },
        get length(): number { return Object.keys(store).length; },
        key: (index: number): string | null => Object.keys(store)[index] || null,
    };
})();

// Assign localStorage to globalThis for Node.js environment
(globalThis as Record<string, unknown>).localStorage = localStorageMock;
