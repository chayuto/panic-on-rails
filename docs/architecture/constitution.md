# PanicOnRails Project Constitution
## Notations, Parts, Angles, and Data Conventions

> This document defines the authoritative rules governing how data is stored, calculated, and interpreted in the PanicOnRails codebase. All contributors must adhere to these conventions.

---

## Table of Contents

1. [Fundamental Rules](#1-fundamental-rules)
2. [Coordinate System](#2-coordinate-system)
3. [Angle Conventions](#3-angle-conventions)
4. [Connectors & Facades](#4-connectors--facades)
5. [Part Geometry Types](#5-part-geometry-types)
6. [Track Placement](#6-track-placement)
7. [Edge Geometry Storage](#7-edge-geometry-storage)
8. [Node Rotation Storage](#8-node-rotation-storage)
9. [Connection & Snapping Rules](#9-connection--snapping-rules)
10. [Train Movement](#10-train-movement)
11. [Quick Reference Tables](#11-quick-reference-tables)

---

## 1. Fundamental Rules

### The Three Laws of Angles

> [!IMPORTANT]  
> 1. **ALL angles are stored in DEGREES** - no exceptions
> 2. **ALL angles are normalized to [0, 360)** before storage
> 3. **Radians are used ONLY at the point of calculation** (sin, cos, tan)

### The Bidirectional Track Rule

> [!IMPORTANT]  
> **TRACKS HAVE NO DIRECTION**. Trains can travel in either direction on any track.
> 
> - The "A/B" or "start/end" connector labels are naming conventions only
> - These labels exist for identification, NOT for indicating travel direction
> - Only trains have a `direction` property

### Normalization Function (MANDATORY)

```typescript
function normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
}
```

Every angle MUST pass through this function before being stored.

### Radian Conversion (ONLY for Math Functions)

```typescript
// Use ONLY at the moment of calling sin/cos/tan
const radians = (degrees * Math.PI) / 180;
const result = Math.cos(radians);
```

Never store radians. Never pass radians between functions. Convert at point of use.

---

## 2. Coordinate System

### Screen Space
PanicOnRails uses **standard screen coordinates**:

```
Origin (0,0) ──────────────► +X (East/Right)
     │
     │
     │
     ▼
   +Y (South/Down)
```

| Property | Value |
|----------|-------|
| Origin | Top-left of canvas |
| +X direction | Right (east) |
| +Y direction | Down (south) |
| Units | Pixels (runtime), Millimeters (catalog) |

### Angle Reference Direction
**0° points RIGHT (east)**, along the positive X-axis.

---

## 3. Angle Conventions

### Universal Unit: DEGREES

| Context | Unit | Range | Storage Rule |
|---------|------|-------|--------------|
| Part catalog (`*.json`) | Degrees | positive | As defined |
| `TrackNode.rotation` | Degrees | [0, 360) | Normalized |
| `ConnectorNode.localFacade` | Degrees | [0, 360) | Normalized |
| `WorldConnector.worldFacade` | Degrees | [0, 360) | Normalized |
| `ArcGeometry.startAngle` | **Degrees** | [0, 360) | Normalized |
| `ArcGeometry.endAngle` | **Degrees** | any | May exceed 360 for arcs crossing 0° |
| Function parameters | Degrees | any | Normalize before storing |
| Calculation intermediates | Radians OK | - | Never stored |

### Angle Direction

Due to the Y-down coordinate system:
- **Visually**: Positive angles rotate **clockwise** on screen
- **Mathematically**: This corresponds to standard counter-clockwise in a Y-up system

| Angle | Cardinal Direction | Visual Direction |
|-------|-------------------|------------------|
| 0° | East | → Right |
| 90° | South | ↓ Down |
| 180° | West | ← Left |
| 270° | North | ↑ Up |

### Angle Difference Calculation

```typescript
function angleDifference(a: number, b: number): number {
    const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    return diff > 180 ? 360 - diff : diff;
}
```

Result is always in range [0, 180].

---

## 4. Connectors & Facades

### What is a Facade?
A **facade** is the direction a connector "faces" - the outward-pointing direction perpendicular to the track at that connection point.

```
━━━━━━━●━━━━━━━━━━━━●━━━━━━━
       ↑            ↑
   Facade A      Facade B
   (faces west)  (faces east)
     180°          0°
```

### Mating Rule
**Two connectors can connect when their facades are 180° apart** (within tolerance).

```typescript
function canMate(facadeA: number, facadeB: number, tolerance: number): boolean {
    const diff = angleDifference(facadeA, facadeB);
    return Math.abs(diff - 180) <= tolerance;
}
```

When connector A has `facade = 45°` and connector B has `facade = 225°`:
- Difference = 180° ✓ Compatible for mating

### Connector Naming Convention

| Part Type | Connector IDs | Primary | Notes |
|-----------|--------------|---------|-------|
| Straight | `A`, `B` | `A` | Labels only - no direction implied |
| Curve | `A`, `B` | `A` | Labels only - no direction implied |
| Switch | `entry`, `main`, `branch` | `entry` | Describes topology, not travel direction |
| Crossing | `A1`, `A2`, `B1`, `B2` | `A1` | Two paths, each bidirectional |

> [!NOTE]  
> The names "start", "end", "entry", "exit" describe **connector topology** for the purpose of geometry calculation. They do NOT restrict train travel direction.

---

## 5. Part Geometry Types

### Straight Track

```json
{
    "type": "straight",
    "length": 248
}
```

**Local connector positions** (at placement rotation = 0°):
- **A**: Position `(0, 0)`, Facade `180°`
- **B**: Position `(length, 0)`, Facade `0°`

```
    ←Facade A=180°
    ●━━━━━━━━━━━━━━━━━━━●
    A                   B
   (0,0)            (248,0)
                        Facade B=0°→
```

Trains can travel A→B or B→A.

### Curved Track

```json
{
    "type": "curve",
    "radius": 249,
    "angle": 45
}
```

**Curve geometry**: Curves sweep **counter-clockwise** (to the left) from A to B when viewed at rotation 0°.

**Local connector positions** (at placement rotation = 0°):
- **A**: Position `(0, 0)`, Facade `180°`
- **B**: Position on arc, Facade `angle` (e.g., `45°`)

```
                 ╭──B (facade=45°)
                ╱
               ╱
       Center ╱
        (0,-R)
              ╲
               ╲
                ╲
    A●━━━━━━━━━━━
  (0,0)
   Facade=180°
```

Trains can travel A→B (following the arc) or B→A (following the arc in reverse).

### Switch (Turnout)

```json
{
    "type": "switch",
    "mainLength": 248,
    "branchLength": 186,
    "branchAngle": 15,
    "branchDirection": "left"
}
```

**Local connector positions** (at placement rotation = 0°):
- **entry**: Position `(0, 0)`, Facade `180°`
- **main**: Position `(mainLength, 0)`, Facade `0°`
- **branch**: Position calculated from angle, Facade `±branchAngle`

```
                    ╲ branch
                     ╲
    entry●━━━━━━━━━━━━━━●main
   (0,0)               (248,0)
```

Trains can enter from any connector and exit from any other (subject to switch state).

### Crossing

```json
{
    "type": "crossing",
    "length": 124,
    "crossingAngle": 90
}
```

Two independent paths crossing at center. Each path is bidirectional.

---

## 6. Track Placement

### addTrack API

```typescript
addTrack(partId: string, position: Vector2, rotation: number): EdgeId | null
```

| Parameter | Meaning |
|-----------|---------|
| `partId` | Catalog part identifier (e.g., `"kato-20-000"`) |
| `position` | World coordinates of the **primary connector** |
| `rotation` | Angle in **degrees**; `0°` = part's default orientation |

### Placement Algorithm

1. Load part geometry from catalog
2. Compute connector positions in local space
3. Apply rotation transform (around origin)
4. Translate origin to `position`
5. Create nodes and edges with world coordinates
6. **Normalize all angles before storing**
7. Register in spatial index

### Example: Straight 248mm at position (100, 100), rotation 90°

| Connector | Local Position | World Position | World Facade |
|-----------|---------------|----------------|--------------|
| A (primary) | (0, 0) | (100, 100) | `normalizeAngle(180 + 90)` = 270° |
| B | (248, 0) | (100, 348) | `normalizeAngle(0 + 90)` = 90° |

---

## 7. Edge Geometry Storage

### StraightGeometry (TrackEdge)

```typescript
interface StraightGeometry {
    type: 'straight';
    start: Vector2;  // Position of node labeled "start"
    end: Vector2;    // Position of node labeled "end"
}
```

> [!NOTE]  
> The `start` and `end` labels are for geometry reference only. Trains can travel in either direction.

### ArcGeometry (TrackEdge)

```typescript
interface ArcGeometry {
    type: 'arc';
    center: Vector2;       // World position of arc center
    radius: number;        // Pixels
    startAngle: number;    // DEGREES - angle from center to "start" point
    endAngle: number;      // DEGREES - angle from center to "end" point
}
```

> [!IMPORTANT]  
> Arc angles are in **DEGREES** and measure the angle from the arc center to points on the arc.
> - `startAngle`: Normalized to [0, 360)
> - `endAngle`: May exceed 360° if arc crosses the 0° boundary

### Arc Geometry Calculation Pattern

```typescript
// When creating arc geometry:
const centerAngleDeg = placementRotation - 90;  // Perpendicular left
const arcStartAngleDeg = normalizeAngle(centerAngleDeg + 180);
const arcSweepDeg = curveAngle;  // Already in degrees from catalog
const arcEndAngleDeg = arcStartAngleDeg + arcSweepDeg;  // May exceed 360

// When using for rendering (convert to radians at point of use):
function getPositionOnArc(center, radius, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;  // Convert HERE only
    return {
        x: center.x + Math.cos(rad) * radius,
        y: center.y + Math.sin(rad) * radius
    };
}
```

---

## 8. Node Rotation Storage

### TrackNode.rotation

The `rotation` field of a `TrackNode` stores the **world facade direction** in DEGREES.

```typescript
interface TrackNode {
    id: NodeId;
    position: Vector2;
    rotation: number;      // World facade in DEGREES [0, 360)
    connections: EdgeId[];
    type: 'endpoint' | 'junction' | 'switch';
}
```

This represents the direction the connector **faces outward** (for mating purposes), NOT any direction of travel.

### Stored Values by Part Type

All values are normalized to [0, 360).

| Part Type | Node Label | Rotation Value |
|-----------|------------|----------------|
| Straight | A | `normalizeAngle(placementRotation + 180)` |
| Straight | B | `normalizeAngle(placementRotation)` |
| Curve | A | `normalizeAngle(placementRotation + 180)` |
| Curve | B | `normalizeAngle(placementRotation + curveAngle)` |
| Switch | entry | `normalizeAngle(placementRotation + 180)` |
| Switch | main | `normalizeAngle(placementRotation)` |
| Switch | branch | `normalizeAngle(placementRotation ± branchAngle)` |

---

## 9. Connection & Snapping Rules

### Automatic Snap Detection

When placing a track, the snap system checks:

1. **Distance**: Is any ghost connector within `snapRadius` of an open endpoint?
2. **Angle**: Are facades 180° apart within `angleTolerance`?

```typescript
const DEFAULT_SNAP_CONFIG = {
    'n-scale': { snapRadius: 30, angleTolerance: 15 },
    'wooden':  { snapRadius: 40, angleTolerance: 20 }
};
```

All values in DEGREES.

### Valid Connection

A connection is valid when:
```
angleDifference(facadeA, facadeB) is within [180 - tolerance, 180 + tolerance]
```

### Node Merging

When tracks connect:
1. The new track's connector node is **removed**
2. The existing endpoint **survives**
3. Edge references are updated to point to survivor
4. Survivor may upgrade from `endpoint` to `junction`

---

## 10. Train Movement

### Fundamental Principle

> **Tracks are bidirectional. Only trains have direction.**

### Train State

```typescript
interface Train {
    currentEdgeId: EdgeId;
    distanceAlongEdge: number;  // 0 to edge.length (pixels)
    direction: 1 | -1;          // Train's travel direction on this edge
    speed: number;              // pixels/second
}
```

### Direction Semantics

| Train Direction | Meaning |
|-----------------|---------|
| `+1` | Distance increases (traveling from "start" label toward "end" label) |
| `-1` | Distance decreases (traveling from "end" label toward "start" label) |

The labels are arbitrary reference points. A train with direction `-1` is just as valid as one with `+1`.

### Distance Semantics

| Distance | Position on Edge |
|----------|------------------|
| `0` | At the node labeled "startNode" in the edge |
| `edge.length` | At the node labeled "endNode" in the edge |

### Position Calculation

**Straight edge:**
```typescript
const progress = distance / edge.length;
const x = start.x + (end.x - start.x) * progress;
const y = start.y + (end.y - start.y) * progress;
```

**Arc edge:**
```typescript
const progress = distance / edge.length;
const angleDeg = startAngle + (endAngle - startAngle) * progress;
// Convert to radians ONLY for the math function:
const rad = (angleDeg * Math.PI) / 180;
const x = center.x + Math.cos(rad) * radius;
const y = center.y + Math.sin(rad) * radius;
```

### Edge Transitions

When a train reaches the end of an edge (distance > length or distance < 0):
1. Find the exit node
2. Query that node's other connections
3. Select next edge (based on switch state if applicable)
4. Set new direction based on which end the train enters the new edge

---

## 11. Quick Reference Tables

### Horizontal Track (placement rotation = 0°)

```
    ●━━━━━━━━━━━━━━━━━━━●
    A                   B
   (0,0)              (L,0)
 facade=180°        facade=0°
```

| Node | Position | Facade |
|------|----------|--------|
| A | (0, 0) | 180° |
| B | (L, 0) | 0° |

Train can travel A→B (direction +1) or B→A (direction -1).

### Vertical Track (placement rotation = 90°)

```
    ● A
    ┃   facade=270°
    ┃
    ┃
    ● B
        facade=90°
```

| Node | Position | Facade |
|------|----------|--------|
| A | (0, 0) | 270° |
| B | (0, L) | 90° |

Train can travel A→B (direction +1) or B→A (direction -1).

### Cardinal Rotations

| Placement Rotation | Node A Facade | Node B Facade |
|--------------------|---------------|---------------|
| 0° | 180° (West) | 0° (East) |
| 90° | 270° (North) | 90° (South) |
| 180° | 0° (East) | 180° (West) |
| 270° | 90° (South) | 270° (North) |

### Compatible Connections

| Node X Facade | Compatible Node Y Facade |
|---------------|--------------------------|
| 0° | 180° (±tolerance) |
| 90° | 270° (±tolerance) |
| 180° | 0° (±tolerance) |
| 270° | 90° (±tolerance) |

---

## Appendix A: Code References

| File | Key Definitions |
|------|-----------------|
| `src/types/index.ts` | `TrackNode`, `TrackEdge`, geometry types |
| `src/types/connector.ts` | `ConnectorNode`, `WorldConnector`, snap config |
| `src/data/catalog/types.ts` | Part geometry types |
| `src/data/catalog/helpers.ts` | `computeConnectors()` for all part types |
| `src/utils/snapManager.ts` | `normalizeAngle()`, `angleDifference()`, snap logic |
| `src/utils/facadeConnection.ts` | `canMate()`, facade calculations |
| `src/stores/useTrackStore.ts` | `addTrack()`, node/edge creation |
| `src/hooks/useGameLoop.ts` | `getPositionOnEdge()`, train movement |

---

## Appendix B: Common Mistakes to Avoid

1. **Storing radians**: NEVER store radians - convert only at point of trigonometric calculation
2. **Forgetting normalization**: Always call `normalizeAngle()` before storing degrees
3. **Assuming track direction**: Tracks are bidirectional; only trains have direction
4. **Confusing facade with travel direction**: Facade is for mating, not for travel
5. **Arc angle misinterpretation**: Arc angles are from CENTER to POINT on arc
6. **Primary connector assumption**: Not all parts have connector "A" - switches use "entry"

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Facade** | Direction a connector faces outward (for mating) |
| **Rotation** (node) | World facade angle of a node |
| **Rotation** (placement) | Orientation angle when placing a part |
| **Direction** (train) | +1 or -1 indicating train's travel direction on current edge |
| **Connector** | A connection point on a track piece |
| **Primary Connector** | The connector placed at the specified position during placement |
| **Normalized Angle** | Angle converted to [0, 360) range |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-05 | Antigravity | Initial constitution |
| 1.1 | 2026-01-05 | Antigravity | Mandated degrees-only; removed radian storage |
| 1.2 | 2026-01-05 | Antigravity | Clarified bidirectional tracks; removed direction-from-track language |
