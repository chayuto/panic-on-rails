import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Projects:
 * - chromium: Production build tests (CI + full regression)
 *   Builds app and starts preview server automatically.
 * - dev: Live dev server tests (agentic mid-session workflow)
 *   Expects `pnpm dev` to be running already on port 5173.
 *   Set PLAYWRIGHT_DEV=1 to skip the webServer build.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// When PLAYWRIGHT_DEV is set, skip the build/preview webServer
const skipWebServer = !!process.env.PLAYWRIGHT_DEV;

const webServerConfig = skipWebServer ? {} : {
    webServer: {
        command: 'npm run build && npm run preview',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
};

export default defineConfig({
    testDir: './e2e',
    outputDir: './e2e-results',

    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,

    reporter: process.env.CI
        ? [['html', { open: 'never', outputFolder: 'e2e-report' }], ['github']]
        : [['html', { open: 'never', outputFolder: 'e2e-report' }]],

    use: {
        trace: 'on-first-retry',
        headless: true,
        actionTimeout: 10_000,
    },

    projects: [
        {
            name: 'chromium',
            testIgnore: /specs\//,
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://localhost:4173',
                screenshot: 'only-on-failure',
            },
        },
        {
            name: 'dev',
            testMatch: /specs\//,
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://localhost:5173',
                screenshot: 'on',
            },
        },
    ],

    ...webServerConfig,
});
