import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/', // Custom domain uses root path
    define: {
        __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    build: {
        rolldownOptions: {
            output: {
                // Split the two big stable libraries out of the app chunk so
                // app-code changes don't invalidate the whole cached bundle.
                codeSplitting: {
                    groups: [
                        {
                            name: 'konva',
                            test: /node_modules[\\/](konva|react-konva)[\\/]/,
                            priority: 20,
                        },
                        {
                            name: 'react',
                            test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                            priority: 10,
                        },
                    ],
                },
            },
        },
    },
})

