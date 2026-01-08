# Phase 1: Catalog & Geometry Foundation - Complete

Date: 2026-01-08  
Tasks: 1.1, 1.2, 1.3  
Status: **COMPLETE**

---

## Summary

Phase 1 establishes the foundation for full switch/turnout functionality by updating the parts catalog with accurate geometry and enhancing the connector computation for curved diverging paths.

## Completed Tasks

### Task 1.1: Update Kato Catalog Geometry ✓

**Files Modified:**
- `src/data/catalog/types.ts` - Added `branchRadius` and `isWye` fields
- `src/data/catalog/schemas.ts` - Updated Zod validation
- `src/data/catalog/loader.ts` - Pass through new fields
- `src/data/catalog/parts/kato.json` - Fixed all switch specs
- `src/data/catalog/helpers.ts` - Compute branch from `branchRadius`
- `src/stores/slices/createTrackSlice.ts` - Compute branch geometry

**Key Changes:**
- Product codes fixed: 20-220/221 = #4 (was #6), 20-202/203 = #6 (was #4)
- Corrected mainLength: 126mm for #4, 186mm for #6
- Added branchRadius: R481 for #4, R718 for #6
- Added #2 Wye Turnout (20-222)
- Added S60 clearance pieces

---

### Task 1.2: Add IKEA Lillabo Catalog ✓

**Files Created:**
- `src/data/catalog/parts/ikea.json` - 7 parts

**Files Modified:**
- `src/data/catalog/types.ts` - Added `isPassive` field
- `src/data/catalog/schemas.ts` - Added `isPassive` validation
- `src/data/catalog/loader.ts` - Pass through `isPassive`
- `src/data/catalog/brands/index.ts` - Register IKEA catalog
- `src/data/catalog/index.ts` - Export `IKEA_PARTS`

**IKEA Parts Added:**
| ID | Type | Dimensions |
|----|------|------------|
| ikea-straight-long | straight | 216mm |
| ikea-straight-medium | straight | 144mm |
| ikea-straight-short | straight | 72mm |
| ikea-curve-large | curve | R180, 45° |
| ikea-curve-small | curve | R90, 45° |
| ikea-switch-mechanical | switch | 144mm, R180, 45° |
| ikea-switch-y | switch | passive Y-splitter |

---

### Task 1.3: Enhanced Connector Computation ✓

**Files Created:**
- `src/data/catalog/helpers.test.ts` - 12 new tests

**Files Modified:**
- `src/data/catalog/helpers.ts` - Added arc geometry functions

**New Functions:**
- `calculateArcEndpoint()` - Computes arc endpoint position and tangent
- `normalizeAngle()` - Local helper for angle normalization

**Wye Turnout Handling:**
- Wye switches now generate `entry`, `left`, `right` connectors
- Both branches use symmetric arc geometry

---

## Verification

| Check | Result |
|-------|--------|
| TypeScript compilation | ✓ Pass |
| Unit tests | ✓ 453 pass |
| Lint | ✓ Clean |

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/data/catalog/types.ts` | +`branchRadius`, `isWye`, `isPassive` |
| `src/data/catalog/schemas.ts` | +validation for new fields |
| `src/data/catalog/loader.ts` | +pass through new fields |
| `src/data/catalog/helpers.ts` | +arc geometry, wye handling |
| `src/data/catalog/helpers.test.ts` | NEW: 12 tests |
| `src/data/catalog/parts/kato.json` | Fixed switch geometry |
| `src/data/catalog/parts/ikea.json` | NEW: 7 parts |
| `src/data/catalog/brands/index.ts` | +IKEA registration |
| `src/data/catalog/index.ts` | +IKEA export |
| `src/stores/slices/createTrackSlice.ts` | +branchRadius geometry |

---

## Next Phase

**Phase 2: Visual Rendering** (Tasks 2.1 - 2.3)
- Task 2.1: Switch Track Rendering
- Task 2.2: Switch State Visualization
- Task 2.3: Ghost Preview for Switches
