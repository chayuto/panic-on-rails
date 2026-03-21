# Deep Audit — Action Plan

> Created: 2026-03-21
> PR Epic Branch: `fix/deep-audit-2026-03-21`
> Base: `main` @ fc232a3
> Baseline: 35 test files, 681 tests, all passing
> Gate: `pnpm test --run && pnpm typecheck` must pass after each commit group

---

## Commit Group Strategy

Fixes grouped by theme so each commit is atomic, reviewable, and test-passing. Order
chosen to minimize cascading diffs (foundational fixes first, consumers second).

---

## Group 1: State Mutation & Persistence Fixes
**Commit:** `fix(stores): immutable state updates and localStorage key`
**Scope:** Core store correctness — highest impact, least cascade risk.

| ID | Fix | File(s) |
|----|-----|---------|
| B02 | `removeTrack` — create new node object instead of mutating | `createTrackSlice.ts` |
| B03 | Fix localStorage key `panic-on-rails-track-v1` → `panic-on-rails-v1` | `FileActions.tsx` |
| B11 | `getScreenShakeOffset` — store `startTime` in ScreenShake, compute real progress | `useEffectsStore.ts` |
| B18 | `connectNodesOp` — preserve switch type when merging | `connectionOps/connect.ts` |
| B19 | Rebuild spatial index for modified edges in `connectNodesOp` | `connectionOps/connect.ts` |
| B20 | `removeTrack` — cascade-delete orphaned sensors/signals/wires | `createTrackSlice.ts` |

---

## Group 2: Angle & Facade Convention Compliance
**Commit:** `fix(geometry): angle normalization, CW arc tangents, and facade fixes`
**Scope:** Constitution compliance — angles, facades, radians.

| ID | Fix | File(s) |
|----|-----|---------|
| B04 | CW arc tangent: use `-90` for CW direction | `connectTransform.ts`, `trainGeometry.ts` |
| B06 | `calculateT` — normalize `pointAngleDeg` relative to arc start | `hitTesting.ts` |
| B13 | Switch connector — call `normalizeAngle()` on branch facade | `connectors/switch.ts` |
| S01 | Replace inline `Math.PI / 180` with `degreesToRadians()`/`radiansToDegrees()` | `geometry.ts`, `facadeConnection.ts`, `connectTransform.ts`, `trackRenderingUtils.ts`, `trainGeometry.ts`, `standardTrack.ts`, `switchTrack.ts`, `crossingTrack.ts` |
| S02 | Add missing `normalizeAngle()` calls in connector files and sleeper gen | `connectors/*.ts`, `trackRenderingUtils.ts` |
| W07 | Reduce `MATE_ANGLE_TOLERANCE` from 45° to 20° (or parameterize per scale) | `facadeConnection.ts` |

---

## Group 3: Geometry Engine Fixes
**Commit:** `fix(geometry): arc bounds, arc engine, and hit testing`
**Scope:** Correct geometric calculations.

| ID | Fix | File(s) |
|----|-----|---------|
| B07 | `ArcEngine.getBounds()` — check axis-aligned extremes within swept range | `ArcEngine.ts` |
| B12 | Crossing origin — align track creator with connector convention | `crossingTrack.ts` |
| W04 | `isEdgeActiveOnSwitch` — pre-compute lookup map | `TrackLayer.tsx` |

---

## Group 4: Catalog & Schema Fixes
**Commit:** `fix(catalog): schema alignment, dead code, and data integrity`
**Scope:** Data correctness and type safety.

| ID | Fix | File(s) |
|----|-----|---------|
| B14 | Align Zod schema with TS types (length required, add buildTime, add debug) | `schemas/layout.ts` |
| B15 | Delete dead brand TS files (kato.ts, brio.ts) | `brands/kato.ts`, `brands/brio.ts` |
| B16 | Add `branchRadius`/`isWye`/`isPassive` to `SwitchOptions` | `helpers.ts` |
| B17 | Fix duplicate productCode "20-150" in kato.json | `parts/kato.json` |
| W11 | Add `ho-scale` entry to `DEFAULT_SNAP_CONFIG` | `types/connector.ts` |
| W12 | Add `.refine()` to SwitchPartSchema for branchRadius/branchLength | `schemas.ts` |
| W13 | Add `branchAngle` max constraint | `schemas.ts` |
| W14 | Remove `as LayoutData` cast, use Zod-inferred type | `fileManager.ts` |

---

## Group 5: Connection & Snap Logic Fixes
**Commit:** `fix(connection): connect mode, facade tolerance, and crossing placement`
**Scope:** Connection behavior correctness.

| ID | Fix | File(s) |
|----|-----|---------|
| B08 | `useConnectMode` — compare `edgeId` not `partId` | `useConnectMode.ts` |
| W08 | Auto-merge: enforce angle check even within 3px | `useEditModeHandler.ts` |
| W09 | Add facade validation in `connectNetworksOp` | `connectionOps/network.ts` |
| W10 | `getEndFacade` — handle switch/crossing geometry or mark deprecated | `facadeConnection.ts` |

---

## Group 6: Simulation Engine Fixes
**Commit:** `fix(simulation): game loop architecture, multi-edge traversal, collision`
**Scope:** Simulation correctness and stability.

| ID | Fix | File(s) |
|----|-----|---------|
| B01 | Restructure game loop: use `getState()` inside rAF, minimal deps | `useGameLoop.ts` |
| B09 | Add cross-edge collision detection at shared nodes | `collisionManager.ts`, `collision.ts` |
| B10 | Multi-edge traversal loop (handle overflow across multiple short edges) | `movement.ts` |
| B05 | Switch branch — store arc geometry when `branchRadius` provided | `switchTrack.ts` |
| W17 | Switch routing fallback — log warning instead of silently picking first edge | `movement.ts` |
| W18 | Bounce distance — clamp properly for large overflow | `movement.ts` |
| W20 | Game loop error recovery — auto-pause and allow restart | `useGameLoop.ts` |

---

## Group 7: Performance & Rendering Fixes
**Commit:** `perf(render): atomic selectors, memoization, and layer optimization`
**Scope:** Render performance.

| ID | Fix | File(s) |
|----|-----|---------|
| W01 | Convert non-atomic selectors to atomic in critical-path components | Multiple (prioritize: `useGameLoop.ts`, `TrainLayer.tsx`, `TrackLayer.tsx`, `SensorLayer.tsx`) |
| W02 | Wrap `TrainEntity` in `React.memo` | `TrainLayer.tsx` |
| W03 | Memoize BackgroundLayer grid lines | `BackgroundLayer.tsx` |
| W05 | GhostLayer — compare values before `setState` | `GhostLayer.tsx` |
| W06 | Replace `JSON.stringify` content hash with version counter | `TrackLayer.tsx` |
| S08 | Add `listening={false}` to simulation layer | `StageWrapper.tsx` |

---

## Group 8: Cleanup & Documentation
**Commit:** `chore: cleanup dead code, fix comments, and update constitution`
**Scope:** Code hygiene.

| ID | Fix | File(s) |
|----|-----|---------|
| S03 | `crashPhysics.ts` — convert rotation/angularVelocity to degrees | `crashPhysics.ts`, `CrashLayer.tsx` |
| S04 | Rename catalog `StraightGeometry` to `CatalogStraightGeometry` or add clarifying comment | `catalog/types.ts` |
| S05 | Remove duplicate JSDoc blocks | `hitTesting.ts`, `trainGeometry.ts` |
| S06 | Fix "track direction" language in comments | `facadeConnection.ts` |
| S07 | Remove unused params from `connectTransform.ts` | `connectTransform.ts` |
| S09 | Fix misleading JSDoc in `useTrackStore.ts` | `useTrackStore.ts` |
| S10 | Re-export `WireSourceType`/`WireTargetType` from barrel | `types/index.ts` |
| S11 | Delete dead `useModeActions` | `useModeStore.ts` |
| W15 | Already handled in B15 (delete dead brand files) | — |

---

## Verification Strategy

1. **Per-commit gate:** `pnpm test --run && pnpm typecheck && pnpm lint`
2. **No headless browser tests available** (no Playwright/Cypress). Unit tests + typecheck are the automated gates.
3. **Test additions:** New tests for CW arc facades, crossing placement, multi-edge traversal, cross-edge collision, screen shake decay.
4. **Final check:** Full test suite + typecheck + lint before PR creation.

---

## Risk Assessment

| Group | Risk | Mitigation |
|-------|------|------------|
| G1 (State) | State shape changes could break persist | Test with fresh + migrated localStorage |
| G2 (Angles) | CW arc fix may shift existing arc rendering | Add CW arc tests before changing |
| G5 (Connection) | Tighter tolerance may break existing layouts | Use 20° (still generous) not 15° |
| G6 (Simulation) | Game loop restructure is invasive | Keep existing test coverage passing |
| G7 (Perf) | Selector changes touch many files | Mechanical change, low logic risk |
