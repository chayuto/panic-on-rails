import { defineConfig } from 'vitest/config'

export default defineConfig({
    define: {
        __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    test: {
        setupFiles: ['./src/setupTests.ts'],
        globals: true,
        // Agent worktrees live under .claude/worktrees; never run their copies
        exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', '.claude/**'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/__tests__/**', 'src/**/*.test.ts'],
            // Floors a little under today's numbers: coverage may only go up.
            // Components and hooks are covered by the Playwright suites instead.
            thresholds: {
                'src/simulation/**': { lines: 90, statements: 86, functions: 84, branches: 80 },
                'src/stores/**': { lines: 87, statements: 83, functions: 74, branches: 70 },
                'src/data/**': { lines: 85, statements: 85, functions: 83, branches: 76 },
                'src/utils/**': { lines: 65, statements: 64, functions: 53, branches: 65 },
            },
        },
    },
})
