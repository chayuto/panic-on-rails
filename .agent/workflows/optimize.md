---
description: Optimize performance of graph algorithms or rendering
---

# Optimization Workflow

## Steps

1. **Establish Baseline**
   - Identify the function/component to optimize
   - Note current test coverage
   - If no tests exist, add them first

2. **Analyze Complexity**
   - Review current implementation for O(n²) bottlenecks
   - Check for unnecessary re-renders (React)
   - Check for missing caching (Konva)

3. **Implement Optimization**
   - Apply the optimization
   - Common patterns:
     - Spatial indexing for collision detection
     - Memoization for expensive calculations
     - Konva `.cache()` for complex shapes
     - `listening={false}` for non-interactive layers
     - Atomic Zustand selectors

4. **Verify**
   - Run existing tests: `pnpm test`
   - Ensure no regression in functionality
   - Observe frame rate in browser DevTools

5. **Document**
   - Add JSDoc explaining the optimization
   - Note any tradeoffs in comments

## Common Konva Optimizations

```typescript
// Disable hit detection on non-interactive layers
<Layer listening={false}>
  <BackgroundGrid />
</Layer>

// Use wider hit regions for thin lines
<Line hitStrokeWidth={20} stroke="#333" strokeWidth={2} />

// Cache complex groups
useEffect(() => {
  groupRef.current?.cache();
}, [dependencies]);
```

## Common Zustand Optimizations

```typescript
// Use atomic selectors
const trains = useStore(state => state.trains);

// For multiple properties, use useShallow
import { useShallow } from 'zustand/react/shallow';
const { trains, edges } = useStore(
  useShallow(state => ({ trains: state.trains, edges: state.edges }))
);
```
