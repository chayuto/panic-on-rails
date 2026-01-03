# Debug Performance Overlay — Completion Report

**Date:** 2026-01-03  
**Status:** ✅ COMPLETE

---

## Summary

Added a developer debug overlay that displays real-time performance metrics including FPS, frame time, object counts (tracks, nodes, trains, sensors, signals, wires), and heap memory usage (Chrome only). The overlay is hidden by default and can be activated via keyboard shortcut or URL parameter.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/hooks/usePerformanceMetrics.ts` | Custom hook for collecting performance metrics |
| `src/components/ui/DebugOverlay.tsx` | Debug overlay UI component |
| `src/components/ui/DebugOverlay.css` | Terminal-aesthetic styling |
| `src/hooks/usePerformanceMetrics.test.ts` | Unit tests for metrics hook (5 tests) |

## Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Added `<DebugOverlay />` component |
| `src/main.tsx` | Added console hint for debug overlay activation |

---

## Features

### Metrics Displayed
- **FPS** — Frames per second, updates every second
- **Frame Time** — Time per frame in milliseconds
- **Object Counts** — Tracks, Nodes, Trains, Sensors, Signals, Wires
- **Heap Size** — JavaScript heap memory (Chrome only)

### Activation Methods
1. **Keyboard Shortcut** — Press `` ` `` (backtick) to toggle
2. **URL Parameter** — Add `?debug` to URL
3. **localStorage** — Persists toggle state across sessions

### Visual Features
- Terminal aesthetic (green text on dark background)
- Color-coded performance indicators:
  - Green: FPS ≥55, Frame ≤17ms (excellent)
  - Yellow: FPS ≥30, Frame ≤33ms (acceptable)
  - Red: Below thresholds (poor)
- Fixed position in top-right corner (below toolbar)
- Close button to dismiss

---

## Verification Results

### TypeScript
```
pnpm typecheck
✅ No errors
```

### Lint
```
eslint [new/modified files]
✅ No errors (pre-existing issues in loader.ts and useGameLoop.ts unrelated to this feature)
```

### Test Suite
```
pnpm test -- --run
✅ 23 tests pass (18 existing + 5 new)
```

### New Tests
- `usePerformanceMetrics.test.ts`
  - ✅ Should export usePerformanceMetrics function
  - ✅ Should export PerformanceMetrics interface type
  - ✅ Should allow null for heapSizeMB (non-Chrome browsers)
  - ✅ Should have all required numeric fields
  - ✅ Should have heapSizeMB as number or null

---

## Usage

### Activate Debug Overlay
```bash
# Method 1: Keyboard
Press ` (backtick key)

# Method 2: URL
http://localhost:5173/panic-on-rails/?debug
```

### Console Hint (Development Only)
When running in dev mode, a hint appears in the console:
```
🔧 Debug overlay available!
Press ` (backtick) to toggle, or add ?debug to URL
```

---

## Technical Details

### Performance Considerations
- Hook only runs RAF loop when overlay is **visible**
- Object counts use selective Zustand subscriptions to minimize re-renders
- FPS calculation updates once per second (not per frame)

### Browser Compatibility
- FPS/Frame Time: All modern browsers
- Heap Memory: Chrome only (gracefully falls back to null)

---

## Screenshots

*Debug overlay showing real-time metrics with terminal aesthetic*

```
┌─────────────────────────────┐
│ 🔧 Debug                  ✕ │
├─────────────────────────────┤
│ FPS:        60              │
│ Frame:      16.7ms          │
│ ─────────────────────────── │
│ Tracks:     12              │
│ Nodes:      24              │
│ Trains:     2               │
│ ─────────────────────────── │
│ Sensors:    3               │
│ Signals:    1               │
│ Wires:      4               │
│ ─────────────────────────── │
│ Heap:       28.5 MB         │
└─────────────────────────────┘
```
