# Track Parts Catalog

This directory contains the track parts catalog for PanicOnRails.

## Quick Start: Adding a New Part

### 1. Find Your Brand File

```
brands/
├── kato.ts    # Kato Unitrack N-Scale
├── brio.ts    # Brio / IKEA Wooden Railway
└── tomix.ts   # Tomix Fine Track (coming soon)
```

### 2. Use a Helper Function

Instead of writing:
```typescript
{
  id: 'kato-20-000',
  name: 'Straight 248mm',
  brand: 'kato',
  scale: 'n-scale',
  geometry: { type: 'straight', length: 248 }
}
```

Write this:
```typescript
straight('kato-20-000', 'Straight 248mm', 248, 'kato', 'n-scale')
```

### 3. Run Tests

```bash
pnpm test
```

---

## Helper Functions

| Function | Parameters | Example |
|----------|------------|---------|
| `straight()` | id, name, length, brand, scale | `straight('id', 'Name', 248, 'kato', 'n-scale')` |
| `curve()` | id, name, radius, angle, brand, scale | `curve('id', 'Name', 315, 45, 'kato', 'n-scale')` |
| `switchPart()` | id, name, options, brand, scale | See below |
| `crossing()` | id, name, length, angle, brand, scale | `crossing('id', 'Name', 248, 90, 'kato', 'n-scale')` |

### Switch Example

```typescript
switchPart('kato-20-202', '#4 Turnout Left', {
  mainLength: 248,
  branchLength: 186,
  branchAngle: 15,
  branchDirection: 'left',
}, 'kato', 'n-scale')
```

---

## Adding a New Brand

1. Create `brands/your-brand.ts`:

```typescript
import { straight, curve } from '../helpers';
import type { PartDefinition } from '../types';

export const YOUR_BRAND_PARTS: PartDefinition[] = [
  straight('your-brand-001', 'Straight 200mm', 200, 'generic', 'n-scale'),
  // ... more parts
];
```

2. Register in `brands/index.ts`:

```typescript
import { YOUR_BRAND_PARTS } from './your-brand';
registerParts(YOUR_BRAND_PARTS);
```

3. Run tests:

```bash
pnpm test
```

---

## Part ID Convention

Format: `{brand}-{product-code}`

Examples:
- `kato-20-000` (Kato product 20-000)
- `wooden-straight-long` (Wooden railway, no product code)
- `tomix-1101` (Tomix product 1101)

---

## Geometry Reference

### Straight
- `length`: Track length in millimeters

### Curve
- `radius`: Curve radius in millimeters
- `angle`: Arc angle in degrees (e.g., 45, 30, 15)

### Switch
- `mainLength`: Length of straight-through path
- `branchLength`: Length of diverging path
- `branchAngle`: Angle of divergence in degrees
- `branchDirection`: `'left'` or `'right'`

### Crossing
- `length`: Length of each crossing track
- `crossingAngle`: Angle between tracks (90 = perpendicular)
