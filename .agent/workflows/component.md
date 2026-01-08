---
description: Create a new React/Konva component
---

# Component Creation Workflow

## Steps

1. **Determine Component Type**
   - Canvas component → `src/components/canvas/`
   - UI component → `src/components/ui/`

2. **Create Component File**
   - Use functional component with TypeScript
   - Define Props interface with JSDoc
   - Export as named export

3. **Create Test File**
   - Create `ComponentName.test.tsx` alongside component
   - Add basic render test
   - Add interaction tests if applicable

4. **Update Barrel Export**
   - Add export to `src/components/canvas/index.ts` or `src/components/ui/index.ts`

5. **Verify**
   - Run `pnpm typecheck`
   - Run `pnpm test`

## Component Template

```typescript
/**
 * ComponentName - Brief description
 * 
 * @component
 */

interface ComponentNameProps {
    /** Description of prop */
    propName: PropType;
}

export function ComponentName({ propName }: ComponentNameProps) {
    return (
        // JSX
    );
}
```

## Canvas Component Template

```typescript
import { Group } from 'react-konva';

interface CanvasComponentProps {
    /** X position */
    x: number;
    /** Y position */
    y: number;
}

export function CanvasComponent({ x, y }: CanvasComponentProps) {
    return (
        <Group x={x} y={y}>
            {/* Konva shapes */}
        </Group>
    );
}
```
