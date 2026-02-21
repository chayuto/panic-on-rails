# Extract Magic Numbers in crashPhysics to Config

**Date:** 2026-02-21  
**Type:** Refactor (Safe / No Behavior Change)  
**Risk Level:** Low  
**Impact:** Maintainability improvement  

## Summary

Extracted hardcoded magic numbers from `crashPhysics.ts` into the centralized `PHYSICS` config object in `config/physics.ts`, improving configurability and maintainability.

## Changes

### `src/config/physics.ts`
- Added `GROUND_FRICTION: 0.95` — per-frame velocity decay for parts sliding on the ground after max bounces
- Added `GROUND_ANGULAR_FRICTION: 0.95` — per-frame angular velocity decay for sliding parts

### `src/utils/crashPhysics.ts`
- Replaced hardcoded `0.95` ground friction values (lines 204–205) with `GROUND_FRICTION` and `GROUND_ANGULAR_FRICTION` from config
- Replaced hardcoded crash severity thresholds `50` and `150` (lines 237–238) with existing config constants `CRASH_SPEED_THRESHOLD_LOW` and `CRASH_SPEED_THRESHOLD_HIGH`
- Destructured all used PHYSICS constants at module top for clarity

### `src/utils/__tests__/crashPhysics.test.ts`
- Added 4 new tests in `config integration` describe block:
  - Verifies `CRASH_SPEED_THRESHOLD_LOW` is used as severity 1→2 boundary
  - Verifies `CRASH_SPEED_THRESHOLD_HIGH` is used as severity 2→3 boundary
  - Verifies `GROUND_FRICTION` is applied to sliding parts' velocity
  - Verifies `GROUND_ANGULAR_FRICTION` is applied to sliding parts' angular velocity

## Rationale

- **Previously:** Ground friction values `0.95` were hardcoded in `updateCrashedParts()`, making them invisible and hard to tune. Crash severity thresholds `50` and `150` duplicated existing config constants `CRASH_SPEED_THRESHOLD_LOW` and `CRASH_SPEED_THRESHOLD_HIGH`.
- **Now:** All physics constants live in `config/physics.ts`, the single source of truth. This makes physics tuning a config-only change, reducing risk of inconsistency.

## Verification

- All 685 existing tests pass (35 test files)
- 4 new tests added and passing (25 total in crashPhysics.test.ts)
- Full lint and typecheck pass with zero warnings
- No behavioral change — extracted values are identical to previous hardcoded values
