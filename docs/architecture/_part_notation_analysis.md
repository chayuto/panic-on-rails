# Intermediate Analysis: Part Placement & Notation Conventions

This document analyzes how track parts are positioned, rotated, and connected in PanicOnRails.

---

## 1. Part Identification

### PartId Format
```
{brand}-{product_code}
```
Examples:
- `kato-20-000` - Kato 248mm straight
- `wooden-curve-large` - Brio/wooden large curve
- `kato-20-202` - Kato #4 turnout left

### Edge/Node IDs
- **EdgeId**: UUID v4 (e.g., `"a1b2c3d4-e5f6-..."`)
- **NodeId**: UUID v4
- Generated at placement time via `uuidv4()`

---

## 2. Part Geometry Types

### Type Hierarchy
```
PartGeometry = StraightGeometry | CurveGeometry | SwitchGeometry | CrossingGeometry
```

### StraightGeometry
```typescript
{
    type: 'straight';
    length: number;  // millimeters in catalog, pixels in runtime
}
```

### CurveGeometry
```typescript
{
    type: 'curve';
    radius: number;  // millimeters/pixels
    angle: number;   // degrees (positive = left curve)
}
```

### SwitchGeometry
```typescript
{
    type: 'switch';
    mainLength: number;     // straight-through path length
    branchLength: number;   // diverging path length
    branchAngle: number;    // degrees (always positive)
    branchDirection: 'left' | 'right';  // which side branch goes
}
```

### CrossingGeometry
```typescript
{
    type: 'crossing';
    length: number;         // length of each track arm
    crossingAngle: number;  // angle between tracks (e.g., 90° or 15°)
}
```

---

## 3. Connector Naming Convention

### Simple Parts (2 connectors)
- **A**: Start/entry connector (at origin)
- **B**: End/exit connector

### Switch Parts (3 connectors)
- **entry**: Entry point (at origin)
- **main**: Straight-through exit
- **branch**: Diverging exit

### Crossing Parts (4 connectors)
- **A1**: Path A start
- **A2**: Path A end
- **B1**: Path B start
- **B2**: Path B end

---

## 4. Local Coordinate System

### Origin Placement
The part origin (0, 0) is placed at the **primary connector**:
- For straight/curve: Connector A
- For switch: Entry connector
- For crossing: Connector A1

### Local Axes
- **+X**: Forward direction (direction of travel from start)
- **+Y**: 90° clockwise from +X (to the right of travel in screen coords)
- **Rotation 0°**: +X points right (east)

### Connector Position Examples

**Straight 248mm at rotation=0°:**
```
A: (0, 0), facade=180°
B: (248, 0), facade=0°
```

**45° Left Curve R249 at rotation=0°:**
```
A: (0, 0), facade=180°
B: (calculated from arc), facade=45°

Arc center: (0, -249)  [perpendicular left = up]
```

---

## 5. Placement Transform

### addTrack(partId, position, rotation) Semantics

```
position: World coordinates of the PRIMARY connector
rotation: Angle in degrees, 0° = pointing right
```

### Transform Sequence
1. Start with part in local coordinates (origin at primary connector)
2. Rotate around origin by `rotation` degrees
3. Translate so origin is at `position`

### World Position Calculation
```typescript
function localToWorld(localPos, worldOrigin, worldRotation) {
    const rad = (worldRotation * Math.PI) / 180;
    return {
        x: worldOrigin.x + localPos.x * cos(rad) - localPos.y * sin(rad),
        y: worldOrigin.y + localPos.x * sin(rad) + localPos.y * cos(rad),
    };
}
```

### World Facade Calculation
```typescript
worldFacade = normalizeAngle(localFacade + worldRotation);
```

---

## 6. Edge Geometry Storage

### StraightGeometry → TrackEdge
```typescript
{
    type: 'straight',
    start: Vector2,  // World position of startNode
    end: Vector2,    // World position of endNode
}
```

### CurveGeometry → ArcGeometry (TrackEdge)
```typescript
{
    type: 'arc',
    center: Vector2,      // World position of arc center
    radius: number,       // Same as part radius
    startAngle: number,   // Radians, angle from center to start point
    endAngle: number,     // Radians, angle from center to end point
}
```

**Important**: Arc angles are in **radians** and measure the angle **from the arc center to the point on the arc**, not the tangent direction.

---

## 7. Node Rotation vs Facade

### Terminology
- **Facade** (connector.ts): Direction a connector "faces" - outward from track
- **Rotation** (TrackNode): Stored world facade of the node

These are the **same thing** in different contexts:
- `ConnectorNode.localFacade`: Local-space facade
- `WorldConnector.worldFacade`: Computed world-space facade
- `TrackNode.rotation`: Persisted world-space facade

### Why It's Called "Rotation"
Historical naming - it's the direction the node is "rotated to face". A node at rotation=90° faces downward (south) and would connect to incoming tracks from the north.

---

## 8. Connection Semantics

### For Two Nodes to Connect
1. **Position**: Must be within `snapRadius` (30-40 pixels)
2. **Angle**: Facades must be 180° apart (±tolerance)

### When Connected
- One node is "removed" (merged into survivor)
- The surviving node gains all edge connections
- Edge references updated: removed node → survivor node
- Survivor type may upgrade: endpoint → junction

### Connection Example
```
Node A: position=(100, 100), rotation=0°   (faces east)
Node B: position=(100, 102), rotation=180° (faces west)

Facades are 180° apart → Compatible!
After merge: B's edge now references A instead of B
```

---

## 9. Switch State and Branching

### switchState Property
```typescript
switchState: 0 | 1;
// 0 = main path (straight through)
// 1 = branch path (diverging)
```

### switchBranches Property
```typescript
switchBranches: [EdgeId, EdgeId];
// [mainEdgeId, branchEdgeId]
```

### Train Routing
When train exits through switch node:
```typescript
const nextEdgeId = switchState === 0 
    ? switchBranches[0]  // main
    : switchBranches[1]; // branch
```

---

## 10. Distance Along Edge

### Definition
```typescript
distanceAlongEdge: number; // 0 to edge.length
```
- `0`: At startNode position
- `edge.length`: At endNode position
- Intermediate values: Interpolated along geometry

### For Straight Edges
```typescript
progress = distance / edge.length;
position = start + (end - start) * progress;
```

### For Arc Edges
```typescript
progress = distance / edge.length;
currentAngle = startAngle + (endAngle - startAngle) * progress;
position = center + (cos(currentAngle), sin(currentAngle)) * radius;
```

### Arc Length Calculation
```typescript
function calculateArcLength(radius: number, angleDegrees: number): number {
    const angleRadians = (angleDegrees * Math.PI) / 180;
    return radius * angleRadians;
}
```

---

## 11. Observed Conventions Summary

| Aspect | Convention |
|--------|-----------|
| Coordinate origin | Top-left |
| Y-axis direction | Down (screen coordinates) |
| Angle 0° | Points right (east) |
| Angle increases | Clockwise (visually, due to Y-down) |
| Part origin | Primary connector (A or entry) |
| All facade angles | Degrees, normalized [0, 360) |
| Arc geometry angles | **Radians** (exception!) |
| Connection rule | Facades must differ by 180° ± tolerance |
| Curve direction | Counter-clockwise in math coords = left-curving |

---

## 12. Notation Table for Quick Reference

| Symbol | Meaning | Unit | Range |
|--------|---------|------|-------|
| R | Rotation of placed part | degrees | [0, 360) |
| θ | Curve sweep angle | degrees | positive |
| F | Facade direction | degrees | [0, 360) |
| r | Arc radius | pixels/mm | positive |
| L | Length | pixels/mm | positive |
| α | Arc angle (from center) | radians | any |
| d | Distance along edge | pixels | [0, length] |
