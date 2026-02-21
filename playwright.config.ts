import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Designed for:
 * - Headless agentic coding environments
 * - CI pipelines (GitHub Actions)
 * - Local development (headed mode available via `npm run e2e:headed`)
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',
    outputDir: './e2e-results',

    /* Run tests sequentially in CI for stability, parallel locally */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry failed tests in CI for flake resilience */
    retries: process.env.CI ? 1 : 0,

    /* Limit parallel workers in CI to avoid resource contention */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter configuration */
    reporter: process.env.CI
        ? [['html', { open: 'never', outputFolder: 'e2e-report' }], ['github']]
        : [['html', { open: 'never', outputFolder: 'e2e-report' }]],

    /* Shared settings for all projects */
    use: {
        /* Base URL for relative navigation - matches Vite dev server */
        baseURL: 'http://localhost:4173',

        /* Collect trace on first retry for debugging */
        trace: 'on-first-retry',

        /* Screenshot on failure for debugging */
        screenshot: 'only-on-failure',

        /* Headless by default - CI and agentic environments */
        headless: true,
    },

    /* Test projects - start with Chromium for speed, expand later */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    /* Dev server configuration - use Vite preview for stable builds */
    webServer: {
        command: 'npm run build && npm run preview',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
