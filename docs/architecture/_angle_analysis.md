# Intermediate Analysis: Angle Conventions in PanicOnRails

This document captures raw findings from codebase analysis before synthesizing the final constitution.

---

## 1. Core Coordinate System

### Screen Coordinates
- **Origin**: Top-left of canvas (standard screen coordinates)
- **+X direction**: Right →
- **+Y direction**: Down ↓
- **Angle 0°**: Points right (east), along positive X-axis
- **Angle increases**: Counter-clockwise when viewing standard math coordinates, but in screen coords (Y-down), clockwise visually

### Angle Unit Observations
| Location | Unit | Range | Notes |
|----------|------|-------|-------|
| Part geometry (JSON) | degrees | positive | e.g., `angle: 45` for curves |
| TrackNode.rotation | degrees | [0, 360) | Normalized with `((angle % 360) + 360) % 360` |
| ConnectorNode.localFacade | degrees | [0, 360) | Direction connector "faces" |
| TrackEdge (ArcGeometry) | **radians** | any | `startAngle`, `endAngle` from center |

---

## 2. Facade Angle Semantics

### Definition (from `connector.ts` line 38-46)
```
Facade direction in local coordinates (degrees, 0° = right/east).
This is the direction the connector "faces" - outward from the track.

Convention: For a straight track going left-to-right,
- Left connector facade = 180° (faces left/west)
- Right connector facade = 0° (faces right/east)
```

### Mating Rule (from `facadeConnection.ts` line 63-69)
Two connectors can mate when their facades are **180° apart** (within tolerance):
```typescript
function canMate(facadeA: number, facadeB: number, tolerance = 45): boolean {
    const diff = angleDifference(facadeA, facadeB);
    return Math.abs(diff - 180) <= tolerance;
}
```

---

## 3. Key Angle Values by Part Type

### Straight Track (from `helpers.ts` line 210-227)
```
Origin at connector A (start)
- Connector A: position (0, 0), facade = 180° (faces back/left)
- Connector B: position (length, 0), facade = 0° (faces forward/right)
```

**Interpretation**: 
- A straight track placed at rotation=0° points **right** (east)
- Start (A) faces west (180°), End (B) faces east (0°)

### Curved Track (from `helpers.ts` line 230-269)
```
LEFT-curving arc (counter-clockwise from start)
- Connector A: position (0, 0), facade = 180° (faces back)
- Connector B: position at arc end, facade = curve_angle (e.g., 45° for 45° curve)
```

**Critical Detail**: The curve angle is **added** to rotation:
- End facade = curve_angle (in local coords)
- After placement at world rotation R: end world facade = R + curve_angle

### Switch/Turnout (from `helpers.ts` line 272-301)
```
- Entry: facade = 180° (faces back)
- Main exit: facade = 0° (straight through)
- Branch exit: facade = ±branchAngle (e.g., ±15° for left/right branching)
```

### Crossing (from `helpers.ts` line 304-345)
```
Two intersecting paths:
- Path A: A1 facade = 180°, A2 facade = 0°
- Path B: B1 facade = crossingAngle + 180°, B2 facade = crossingAngle
```

---

## 4. TrackNode.rotation Semantics

### Definition (from `types/index.ts` line 41)
```typescript
rotation: number; // degrees, direction the connector faces
```

This is the **world facade** of the node - the direction it's "looking" for connections.

### Stored Values (from `useTrackStore.ts`)

#### Straight Track (line 375-389)
```typescript
const startNode: TrackNode = {
    rotation: normalizeAngle(rotation + 180), // Facing backwards
};
const endNode: TrackNode = {
    rotation: normalizeAngle(endRotation),    // Same as track direction
};
```

#### Curved Track
- Start node rotation = placement_rotation + 180° (faces back)
- End node rotation = placement_rotation + curve_angle (faces tangent at end)

#### Switch (line 140-164)
- Entry node rotation = placement_rotation + 180° (faces back)
- Main exit rotation = placement_rotation (straight through)
- Branch exit rotation = placement_rotation + (±branchAngle)

---

## 5. Placement Rotation Semantics

### What rotation=0° means
When a track piece is placed with `rotation = 0°`:
- **Straight**: Points right (east), from left to right
- **Curve**: Starts pointing right, curves counter-clockwise (left/up)
- **Switch**: Entry on left, exits on right (main) and right-up or right-down (branch)

### Primary Connector Convention
- The **primary connector** (usually "A" or "entry") is at the origin (0, 0)
- Other connectors are positioned relative to this
- Primary connector's world position = placement position

---

## 6. Arc Geometry (Edge Storage)

### ArcGeometry Interface (from `types/index.ts` line 23-29)
```typescript
interface ArcGeometry {
    type: 'arc';
    center: Vector2;
    radius: number;
    startAngle: number; // radians
    endAngle: number;   // radians
}
```

### Angle Calculation (from `useTrackStore.ts` line 396-416)
```typescript
// Arc center is perpendicular left from start direction
const centerAngle = startRad - Math.PI / 2;  // 90° CCW from direction
const arcCenter = {
    x: position.x + Math.cos(centerAngle) * radius,
    y: position.y + Math.sin(centerAngle) * radius,
};

// Start point angle from center
const arcStartAngle = centerAngle + Math.PI;  // Points back toward start
const arcSweep = (curve_angle * Math.PI) / 180;

edgeGeometry = {
    startAngle: arcStartAngle,
    endAngle: arcStartAngle + arcSweep,
};
```

---

## 7. Direction of Travel (Train Movement)

### Train.direction Property
```typescript
direction: 1 | -1;
```
- `+1`: Moving from startNode toward endNode (distance increases)
- `-1`: Moving from endNode toward startNode (distance decreases)

### Edge Traversal (from `useGameLoop.ts` line 59-107)
When `newDistance > edge.length`:
- Exit via `edge.endNodeId`
- Find next edge via that node's connections
- If entering next edge from its startNode: direction = +1
- If entering from its endNode: direction = -1

---

## 8. Tolerances and Configuration

### Snap Configuration (from `connector.ts` line 148-157)
```typescript
const DEFAULT_SNAP_CONFIG = {
    'n-scale': {
        snapRadius: 30,        // pixels
        angleTolerance: 15,    // ±15° from perfect 180°
    },
    'wooden': {
        snapRadius: 40,
        angleTolerance: 20,    // More forgiving
    },
};
```

### Facade Connection Tolerance (from `facadeConnection.ts` line 18-22)
```typescript
const MATE_DISTANCE_THRESHOLD = 10;  // pixels
const MATE_ANGLE_TOLERANCE = 45;     // degrees (wide for manual connections)
```

---

## Questions to Resolve in Constitution

1. **Normalization**: Always normalize to [0, 360) or allow negative/large angles?
2. **Radian vs Degree**: Arc geometry uses radians; everything else uses degrees. Is this intentional?
3. **Left vs Right Curves**: Currently all curves are left-curving. How to specify right curves?
4. **Visual Direction**: Does 0° appear as pointing right on screen? (screen Y is down)

---

## Files Analyzed
- `src/types/index.ts`
- `src/types/connector.ts`
- `src/types/logic.ts`
- `src/types/mode.ts`
- `src/data/catalog/types.ts`
- `src/data/catalog/helpers.ts`
- `src/data/catalog/README.md`
- `src/data/catalog/parts/kato.json`
- `src/data/catalog/parts/brio.json`
- `src/utils/snapManager.ts`
- `src/utils/facadeConnection.ts`
- `src/utils/connectTransform.ts`
- `src/stores/useTrackStore.ts`
- `src/hooks/useGameLoop.ts`
- `docs/architecture/technical_synthesis.md`
