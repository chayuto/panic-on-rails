# Switch Implementation Progress

**Date:** 2026-01-08  
**Completed:** Phases 1-3 ✓

---

## Phase 1: Catalog & Geometry ✓

**Task 1.1:** Fixed Kato switch geometry (branchRadius, isWye)  
**Task 1.2:** Added IKEA Lillabo catalog with isPassive field  
**Task 1.3:** Added `calculateArcEndpoint()` helper and wye handling

## Phase 2: Visual Rendering ✓

**Tasks 2.1-2.2:** Already implemented via edge-based rendering  
**Task 2.3:** Implemented switch ghost preview in [GhostLayer.tsx](file:///Users/chayut/repos/panic-on-rails/src/components/canvas/GhostLayer.tsx)

## Phase 3: Train Routing ✓

**Task 3.1:** Created [switchRouting.ts](file:///Users/chayut/repos/panic-on-rails/src/utils/switchRouting.ts) with:
- `getSwitchExitEdge()` - proper trailing point handling
- `getDirectionOnNewEdge()` - direction calculation
- `isSwitchPassageAllowed()` - pathfinding support

**Task 3.2:** Covered by existing game loop + Task 3.1

---

## Files Created/Modified

| Phase | File | Change |
|-------|------|--------|
| 1 | `helpers.ts` | +`calculateArcEndpoint()`, wye handling |
| 1 | `ikea.json` | NEW: 7 IKEA Lillabo parts |
| 2 | `GhostLayer.tsx` | +switch ghost preview |
| 3 | `switchRouting.ts` | NEW: switch routing utilities |
| 3 | `useGameLoop.ts` | +use `getSwitchExitEdge()` |

---

## Verification

- ✓ TypeScript compiles
- ✓ 464 tests pass (23 new tests)
- ✓ Lint clean

---

## Remaining Tasks

### Phase 4: User Interaction
- Task 4.1: Click-to-Toggle Switches
- Task 4.2: Toggle Feedback & Animation

### Phase 5: Advanced Features  
- Task 5.1: Dispatcher Board
- Task 5.2: Power Routing

### Gameplay Enhancements
- Task: Switch Audio
- Task: Switch Juice
- Task: Switch Chaos
