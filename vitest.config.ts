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
        exclude: ['node_modules', 'dist', 'e2e'],
    },
})
