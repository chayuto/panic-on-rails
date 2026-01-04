# Track Parts Catalog

This directory contains the track parts catalog for PanicOnRails.

**Architecture Update (2026-01):** The catalog has migrated from TypeScript definitions to a **JSON-based architecture**. This allows for easier portability, potential external loading, and simpler part definitions.

## Quick Start: Adding a New Part

### 1. Find Your Brand's JSON File

Parts are now defined in `src/data/catalog/parts/*.json`.

```
src/data/catalog/parts/
├── kato.json        # Kato Unitrack N-Scale
├── brio.json        # Brio / IKEA Wooden Railway
└── tomix.json       # Tomix Fine Track (coming soon)
```

### 2. Add Part Definition to JSON

Add your part object to the `parts` array in the relevant JSON file.

**Example (Straight Track):**
```json
{
  "id": "kato-20-000",
  "name": "Straight 248mm",
  "type": "straight",
  "length": 248,
  "productCode": "20-000"
}
```

**Example (Curved Track):**
```json
{
  "id": "kato-20-100",
  "name": "Curve R249-45",
  "type": "curve",
  "radius": 249,
  "angle": 45,
  "productCode": "20-100"
}
```

### 3. Verify Registration

Ensure the JSON file is imported and registered in `src/data/catalog/brands/index.ts`. If you are adding a completely new brand file, you must add it there.

---

## JSON Schema Reference

Parts are validated against `PartCatalogFileSchema` in `src/data/catalog/schemas.ts`.

### Common Fields (All Parts)
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g. `brand-code`) |
| `name` | string | Display name |
| `type` | enum | `straight`, `curve`, `switch`, `crossing` |
| `cost` | number? | (Optional) Cost in cents |
| `productCode` | string? | (Optional) Manufacturer code |
| `description` | string? | (Optional) |
| `discontinued` | boolean? | (Optional) |

### Part-Specific Fields

#### Straight
```json
{
  "type": "straight",
  "length": 248  // Length in mm
}
```

#### Curve
```json
{
  "type": "curve",
  "radius": 315, // Radius in mm
  "angle": 45    // Angle in degrees
}
```

#### Switch (Turnout)
```json
{
  "type": "switch",
  "mainLength": 124,     // Straight path length
  "branchLength": 124,   // Diverging path length
  "branchAngle": 15,     // Divergence angle
  "branchDirection": "left" // "left" or "right"
}
```

#### Crossing
```json
{
  "type": "crossing",
  "length": 124,         // Length of each track
  "crossingAngle": 90    // Angle between tracks
}
```

---

## Adding a New Brand

1.  **Create JSON File**: Create `src/data/catalog/parts/my-brand.json`.
    ```json
    {
      "version": 1,
      "brand": "generic",
      "scale": "n-scale",
      "parts": []
    }
    ```

2.  **Register It**: Edit `src/data/catalog/brands/index.ts`:
    ```typescript
    import myBrandJson from '../parts/my-brand.json';
    const MY_BRAND_PARTS = parsePartsCatalog(myBrandJson);
    registerParts(MY_BRAND_PARTS);
    ```

---

## Legacy Helpers (Deprecated)

TypeScript helper functions (`straight()`, `curve()`, etc.) in `helpers.ts` are deprecated for defining catalogs but may still be used internally by the loader. Please prefer defining parts in JSON.
