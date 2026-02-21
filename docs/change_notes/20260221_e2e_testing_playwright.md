# E2E Testing Infrastructure with Playwright

**Date:** 2026-02-21  
**Status:** ✅ Complete  
**Impact:** High (testing infrastructure) | **Risk:** Low (additive only, no existing code logic changed)

## Summary

Implemented a scalable Playwright E2E testing framework for PanicOnRails, configured for headless agentic coding environments and GitHub Actions CI.

## Changes Made

### New Files
| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright configuration (headless, CI-optimized, Vite preview webServer) |
| `e2e/fixtures/app-fixture.ts` | Shared test fixture with clean-state app setup |
| `e2e/app-smoke.spec.ts` | Smoke tests: app loads, layout structure, toolbar buttons (5 tests) |
| `e2e/mode-switching.spec.ts` | Mode toggle: click, keyboard shortcut, sidebar swap (4 tests) |
| `e2e/parts-bin.spec.ts` | Parts sidebar: sections, draggable cards, system tabs (3 tests) |

### Modified Files
| File | Change |
|------|--------|
| `package.json` | Added `@playwright/test` dev dependency; added `e2e`, `e2e:headed`, `e2e:ui`, `e2e:report` scripts |
| `src/App.tsx` | Added `data-testid="app"` and `data-testid="app-main"` |
| `src/components/ui/Toolbar/index.tsx` | Added `data-testid="toolbar"` |
| `src/components/ui/Toolbar/ModeToggle.tsx` | Added `data-testid` to mode toggle container and buttons |
| `src/components/ui/Toolbar/EditToolbar.tsx` | Added `data-testid="edit-tool-{mode}"` to each tool button |
| `src/components/ui/Toolbar/SimulateToolbar.tsx` | Added `data-testid` to play/pause and add train buttons |
| `src/components/ui/Toolbar/FileActions.tsx` | Added `data-testid` to new, save, load, template selector |
| `src/components/ui/Toolbar/ViewActions.tsx` | Added `data-testid` to grid toggle and mute toggle |
| `src/components/ui/PartsBin.tsx` | Added `data-testid="parts-bin"` and `data-testid="part-card-{id}"` |
| `src/components/ui/TrainPanel.tsx` | Added `data-testid` to panel, play, and add train buttons |
| `src/components/canvas/StageWrapper.tsx` | Added `data-testid="canvas-container"` |
| `.github/workflows/ci.yml` | Added Playwright browser install, E2E run, and report artifact upload |
| `.gitignore` | Added `e2e-results/`, `e2e-report/`, `playwright-report/`, `blob-report/`, `test-results/` |
| `eslint.config.js` | Added `e2e` to ignores (Playwright tests don't use React ESLint rules) |
| `vitest.config.ts` | Added `e2e` to exclude list to prevent vitest from picking up Playwright tests |

## Architecture Decisions

### Element Location Strategy
- **`data-testid` attributes** on all interactive and structural elements following `{component}-{action}` naming convention
- Decouples tests from CSS classes and text content which may change
- Pattern: `data-testid="mode-edit-btn"`, `data-testid="edit-tool-select"`, `data-testid="part-card-{id}"`

### Scalable Test Structure
```
e2e/
├── fixtures/           # Shared test fixtures (app setup, auth, etc.)
│   └── app-fixture.ts  # Base fixture: navigate + clean localStorage state
├── app-smoke.spec.ts   # App-level smoke tests
├── mode-switching.spec.ts  # Mode interaction tests
└── parts-bin.spec.ts   # Sidebar component tests
```

### CI Compatibility
- Chromium-only project for speed (expandable via `playwright.config.ts` projects)
- `webServer` uses `npm run build && npm run preview` for stable production builds
- Single worker in CI (`workers: 1`) to avoid resource contention
- Retry on first failure in CI (`retries: 1`) for flake resilience
- HTML report + GitHub reporter in CI; artifact uploaded on every run

### Feedback Mechanism
- Screenshots captured on test failure automatically
- Traces collected on first retry for debugging
- HTML report viewable locally via `npm run e2e:report`
- CI uploads report as downloadable artifact (14-day retention)

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Unit (vitest) | 681 | ✅ All pass |
| E2E (playwright) | 12 | ✅ All pass |
| ESLint | — | ✅ Clean |
| TypeCheck | — | ✅ Clean |

## NPM Scripts Added

| Script | Purpose |
|--------|---------|
| `npm run e2e` | Run E2E tests headless (CI default) |
| `npm run e2e:headed` | Run E2E tests with visible browser (local dev) |
| `npm run e2e:ui` | Open Playwright UI mode for interactive debugging |
| `npm run e2e:report` | Open last HTML test report |
