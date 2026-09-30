# Track Parts Catalog

This directory contains the track parts catalog for PanicOnRails.

**Architecture Update (2026-01):** The catalog has migrated from TypeScript definitions to a **JSON-based architecture**. This allows for easier portability, potential external loading, and simpler part definitions.

## Quick Start: Adding a New Part

### 1. Find Your Brand's JSON File

Parts are now defined in `src/data/catalog/parts/*.json`.

```
src/data/catalog/parts/
├── kato.json        # Kato Unitrack N-Scale
├── marklin.json     # Märklin C-track H0
├── hornby.json      # Hornby Setrack OO
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
| `type` | enum | `straight`, `curve`, `switch`, `crossing`, `compound`, `topology` |
| `category` | enum? | (Optional) Parts-bin section: `straight`, `curve`, `turnout`, `crossing`, `bumper`. Derived from the geometry when left out. |
| `cost` | number? | (Optional) Cost in cents |
| `productCode` | string? | (Optional) Manufacturer code |
| `description` | string? | (Optional) |
| `discontinued` | boolean? | (Optional) |
| `referenceUrl` | string? | (Optional) The source of the part's geometry: the maker's catalog or product page |
| `width` | number? | (Optional) Footprint across the track, mm. Default: the file's `trackWidth` (the roadbed) |
| `roadCrossing` | boolean? | (Optional) The piece carries road-crossing plates as wide as `width` |
| `slab` | boolean? | (Optional) Concrete slab track, like Kato's slab pieces: drawn as a concrete bed with panels, not ballast |
| `deck` | enum? | (Optional) Track carried on a structure: `viaduct` (a concrete deck between walls) or `truss` (a through truss bridge) |
| `deckColor` | string? | (Optional) A bridge's paint, `#rrggbb` |

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

#### Topology (any shape of track)

Curved turnouts, double slips and scissors crossovers are described by their **routes**: the
ways a train can pass through the piece. Each route runs from one connector to another as a
path of straights and arcs.

```json
{
  "type": "topology",
  "connectors": {
    "A1": { "x": 0, "y": 0, "heading": 0 },
    "B1": { "x": 0, "y": 33, "heading": 0 }
  },
  "routes": [
    { "from": "A1", "to": "A2", "path": [{ "straight": 310 }] },
    { "from": "A1", "to": "B2", "path": [
      { "straight": 17.05 },
      { "arc": 583, "angle": 12.9, "turn": "right" },
      { "straight": 16 },
      { "arc": 583, "angle": 12.9, "turn": "left" },
      { "straight": 17.05 }
    ] }
  ]
}
```

- Coordinates are the part's own, in mm: 0° is east, +Y is down, `right` turns clockwise
  on screen.
- `connectors` lists where routes **start**, with the heading a train enters the piece at.
  The first one listed is where the piece is placed from.
- A route that ends at a new name creates that connector. A route that ends at a listed or
  already-created connector must arrive there within 0.5 mm and 0.5°, or the catalog fails to
  load with the gap.
- Two routes at one connector, leaving or arriving, make a set of **points**. The first route
  listed is the normal position. Three routes at one connector are rejected: points have two
  positions.
- Routes may cross without meeting, like the diagonals of a scissors crossover.
- `points` links sets of points that one control throws together, by connector name. Kato's
  WX310 links all four (`[["A1", "A2", "B1", "B2"]]`); a double slip links the two at each
  end. Linked points take the same position, so list each one's normal route first.
- A part with two tracks that never share a connector goes in the bin's crossings section;
  one whose routes split is a turnout. Set `category` to override.

`src/data/catalog/topology.ts` walks the routes. The connector model and the track creator
both use it, so what snaps and what gets built can't disagree. Kato's WX310 (`kato-20-210`) is
the worked example.

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
