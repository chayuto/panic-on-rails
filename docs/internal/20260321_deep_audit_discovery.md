# Deep Codebase Audit — Discovery Document

> Created: 2026-03-21
> Scope: Full codebase audit against constitution.md conventions
> Method: 6 parallel audit agents covering angles, facades, stores, geometry, catalog, simulation

---

## Executive Summary

| Area | BUGs | WARNINGs | STYLE |
|------|------|----------|-------|
| Angle Compliance | 0 | 3 | 12 |
| Facade & Connection | 3 | 7 | 3 |
| Stores & State Mgmt | 3 | 10 | 3 |
| Geometry System | 5 | 8 | 3 |
| Catalog & Types | 5 | 9 | 3 |
| Simulation & Rendering | 5 | 16 | 4 |
| **TOTAL** | **21** | **53** | **28** |

Baseline: 35 test files, 681 tests, all passing.

---

## BUG Findings

### B01: Game Loop Stale Closures & Constant Teardown
- **File:** `src/hooks/useGameLoop.ts`
- **Impact:** Simulation correctness + performance
- The `useEffect` dependency array includes `trains`, `edges`, `nodes` etc. which change every frame, tearing down and recreating the rAF loop every tick. `checkCollisions(trains, edges)` uses the stale pre-update snapshot. `updateTrains` callback also captures stale state.

### B02: `removeTrack` Mutates State In-Place
- **File:** `src/stores/slices/createTrackSlice.ts:179`
- **Impact:** Components may not re-render, stale reads
- `node.connections = node.connections.filter(...)` mutates the original node object because `{ ...state.nodes }` only shallow-copies the map, not individual nodes.

### B03: Wrong localStorage Key in FileActions
- **File:** `src/components/ui/Toolbar/FileActions.tsx:133-134`
- **Impact:** "New Layout" fails to clear persisted data
- Uses `'panic-on-rails-track-v1'` instead of `'panic-on-rails-v1'`. Old layout reappears on refresh.

### B04: CW Arc Tangent Assumes CCW (+90 hardcoded)
- **Files:** `src/utils/connectTransform.ts:106`, `src/utils/trainGeometry.ts:121`
- **Impact:** Incorrect facades for CW arc edges, wrong train facing
- Hardcoded `tangent = radiusAngle + 90` should be `-90` for CW arcs.

### B05: Switch Branch Stored as Straight With `branchRadius`
- **File:** `src/stores/slices/trackCreators/switchTrack.ts:140`
- **Impact:** Branch renders as straight, train positions cut corners
- Always stores `type: 'straight'` geometry even for curved-branch switches.

### B06: `hitTesting.ts` `calculateT` Angle Wrapping
- **File:** `src/utils/hitTesting.ts:276`
- **Impact:** Sensors placed at wrong positions on arcs crossing 0°
- `Math.atan2` returns [-180,180] but `startAngle` is [0,360). For arcs crossing 0° boundary, `t` is wildly wrong.

### B07: `ArcEngine.getBounds()` Misses Arc Extremes
- **File:** `src/geometry/engines/ArcEngine.ts:66`
- **Impact:** Arcs pop in/out during scrolling
- Only uses start/end points; 180° arc extends beyond endpoints.

### B08: `useConnectMode` Compares `partId` vs `edgeId`
- **File:** `src/hooks/useConnectMode.ts:46`
- **Impact:** Can't connect two instances of the same track type
- `sourceEdge.partId === targetEdge.partId` should be edge ID comparison.

### B09: Cross-Edge Collision Detection Missing
- **File:** `src/utils/collisionManager.ts:55`
- **Impact:** Trains pass through each other at edge boundaries
- Only checks trains on the same edge.

### B10: No Multi-Edge Traversal Per Frame
- **File:** `src/simulation/movement.ts:40`
- **Impact:** Trains lose distance at speed on short edges
- Only handles one edge transition per frame.

### B11: `getScreenShakeOffset` Math Bug
- **File:** `src/stores/useEffectsStore.ts:199`
- **Impact:** Screen shake never decays
- `totalDuration = remaining` → `progress` always 0.

### B12: Crossing Origin Convention Mismatch
- **Files:** `src/data/catalog/connectors/crossing.ts`, `src/stores/slices/trackCreators/crossingTrack.ts`
- **Impact:** Snapped crossings placed offset by halfLength
- Connectors define origin at center; track creator treats position as A1.

### B13: Switch Connector Negative Facade
- **File:** `src/data/catalog/connectors/switch.ts:83`
- **Impact:** Violates [0,360) normalization
- Left branch produces `localFacade: -15` instead of 345.

### B14: Zod/TypeScript Schema Mismatches
- **File:** `src/schemas/layout.ts`
- **Impact:** Data loss on roundtrip, runtime `undefined`
- `length` optional in Zod but required in TS. Missing `buildTime`. Missing `debug`.

### B15: Conflicting Kato Data (TS vs JSON)
- **Files:** `src/data/catalog/brands/kato.ts` vs `src/data/catalog/parts/kato.json`
- **Impact:** Dead code with swapped names misleads contributors
- Same part IDs have swapped #4/#6 Turnout names and different geometry.

### B16: `switchPart()` Helper Missing `branchRadius`
- **File:** `src/data/catalog/helpers.ts:98`
- **Impact:** Helper can only create legacy switches
- Missing `branchRadius`, `isWye`, `isPassive` fields.

### B17: Duplicate `productCode` "20-150" in kato.json
- **File:** `src/data/catalog/parts/kato.json:126,144`
- **Impact:** Data integrity — fabricated part entry.

### B18: `connectNodesOp` Overwrites Switch Type
- **File:** `src/stores/slices/connectionOps/connect.ts:78`
- **Impact:** Switch loses switchState/switchBranches when merged
- Unconditionally sets `type: 'junction'`.

### B19: Spatial Index Stale After `connectNodesOp`
- **File:** `src/stores/slices/connectionOps/connect.ts`
- **Impact:** Edge bounds not updated; incorrect viewport culling.

### B20: `removeTrack` Doesn't Clean Up Logic Store
- **File:** `src/stores/slices/createTrackSlice.ts`
- **Impact:** Orphaned sensors/signals persist in localStorage.

### B21: `onRehydrateStorage` Migration Runs Every Load
- **File:** `src/stores/useTrackStore.ts:52-58`
- **Impact:** Wasteful; heuristic could false-positive on migrated data.

---

## Key WARNING Findings

### Performance
- W01: ~71 non-atomic selectors across codebase (re-render on any store change)
- W02: TrainEntity/TrainLayer lack React.memo + use non-atomic selectors
- W03: BackgroundLayer recreates all grid elements on every pan/zoom
- W04: `isEdgeActiveOnSwitch` does O(M×N) scan per render
- W05: GhostLayer forces re-render every rAF frame
- W06: `JSON.stringify` content hash on every render in TrackLayer

### Connection Logic
- W07: MATE_ANGLE_TOLERANCE=45° (3× wider than constitution spec 15°/20°)
- W08: Auto-merge skips angle check within 3px
- W09: No facade validation during `connectNetworksOp`
- W10: `getEndFacade` silently wrong for switches/crossings

### Data Integrity
- W11: `DEFAULT_SNAP_CONFIG` missing `ho-scale` entry
- W12: SwitchPartSchema doesn't enforce branchRadius/branchLength constraint
- W13: Zod angle schemas missing proper range constraints
- W14: `as LayoutData` cast hides schema/type mismatch
- W15: Dead brand TS files (kato.ts, brio.ts) with stale data

### Simulation
- W16: First frame delta always 0
- W17: Switch routing fallback could route through wrong branch
- W18: Bounce distance can go negative at high speed
- W19: No error boundary around `<Stage>`
- W20: Game loop stops permanently on error (no recovery)
- W21: `playSound('bounce')` in hot simulation loop

---

## STYLE Findings (12 most impactful)
- S01: 12 instances of inline `Math.PI / 180` instead of `degreesToRadians()`
- S02: Missing `normalizeAngle()` in connector files and sleeper generation
- S03: `crashPhysics.ts` stores rotation in radians
- S04: `StraightGeometry` naming collision between catalog and graph types
- S05: Duplicate JSDoc blocks in hitTesting.ts and trainGeometry.ts
- S06: `facadeConnection.ts` comments use "track direction" language
- S07: Unused/deprecated parameters in connectTransform.ts
- S08: Simulation layer missing `listening={false}`
- S09: Misleading usage doc in useTrackStore JSDoc
- S10: WireSourceType/WireTargetType not re-exported from barrel
- S11: Dead code `useModeActions` in useModeStore.ts
- S12: `kato-20-047` ID doesn't match productCode "20-046R"
