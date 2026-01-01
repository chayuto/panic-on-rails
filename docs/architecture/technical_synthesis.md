# PanicOnRails Technical Architecture Synthesis

> This document synthesizes key technical decisions from the research materials into actionable architecture for the PanicOnRails project.

---

## 1. Core Philosophy: "Fun Over Physics"

The most critical insight from the research is that **PanicOnRails is a TOY, not a simulator**. This distinction drives every architectural decision:

| Simulator Approach | Toy Approach (PanicOnRails) |
|-------------------|----------------------------|
| Physics engine (Box2D) | Graph traversal |
| Rigid body dynamics | Token-on-edge movement |
| Derailment from forces | Derailment as visual reward |
| Complex collision detection | Binary block occupancy |

> **Key Quote**: "A toy, unlike a game, does not necessarily require a win state, a high score, or a fail condition. Instead, it requires responsiveness, tactile delight, and an intuitive 'snap'."

---

## 2. The Graph-Based Movement Model

### 2.1 Data Structures

```
          [Node A] -------- Edge 1 -------- [Node B]
             |                                   |
          Edge 2                              Edge 3
             |                                   |
          [Node C]                           [Node D]
```

**TrackNode** represents connection points:
- Unique ID
- Position (x, y)
- Rotation (angle of incoming/outgoing track)
- List of connected EdgeIDs
- Type: ENDPOINT | SWITCH | CONNECTOR
- For switches: `switchState` indicating active branch

**TrackEdge** represents the rail segment:
- Unique ID
- References to startNode and endNode
- Geometry (straight line or circular arc)
- Pre-calculated length

### 2.2 Train Movement

The train is **NOT** a physics entity. It is a **cursor** on a graph:

```typescript
interface Train {
  currentEdgeId: string;
  distanceAlongEdge: number;  // 0 to edge.length
  direction: 1 | -1;
  speed: number;  // pixels/second
}
```

**Movement Algorithm:**
```
1. newDistance = distance + speed * direction * deltaTime
2. IF newDistance > edge.length:
   a. Identify exit node (endNode or startNode based on direction)
   b. Query exit node for connected edges (excluding current edge)
   c. IF switch: use switchState to select path
   d. Transition to new edge, carry over overflow distance
3. IF newDistance < 0:
   a. Same logic but entering from opposite end
```

**Why this works:**
- Train CANNOT derail from physics glitches
- Momentum lag causes "teleport catch-up" not tunneling
- Deterministic replay for URL sharing

---

## 3. Geometry: Why Circular Arcs, Not Bezier

The research strongly recommends **Circular Arcs + Straight Lines** over Bezier curves:

| Bezier Curves | Circular Arcs |
|--------------|---------------|
| Non-uniform parameterization | Constant curvature |
| Train speeds up/slows on curves | Constant visual speed |
| Complex arc-length reparameterization | Simple: angle = distance / radius |
| Flexible shapes | Rigid (matches real toy tracks) |

**Parametric Equations for Rendering:**

For a circular arc with `center`, `radius`, `startAngle`, `endAngle`:
```
progress = distance / arcLength
currentAngle = startAngle + (endAngle - startAngle) * progress
x = center.x + radius * cos(currentAngle)
y = center.y + radius * sin(currentAngle)
rotation = currentAngle + 90°  // tangent to circle
```

---

## 4. The "Fuzzy" Snapping System

### 4.1 The Problem

Children (and casual users) don't align coordinates perfectly. A user might drag to (100, 105) intending to connect to a node at (100, 100).

### 4.2 The Algorithm

```typescript
interface SnapResult {
  targetNode: TrackNode | null;
  isValid: boolean;
}

function findSnapTarget(dragNode: Vector2, allNodes: TrackNode[]): SnapResult {
  const HOTZONE_RADIUS = 20; // pixels
  const MAX_ANGLE_DIFF = 15; // degrees
  
  let bestCandidate = null;
  let bestDistance = Infinity;
  
  for (const node of allNodes) {
    // Filter: exclude nodes from same track piece
    if (node.belongsToSamePiece) continue;
    
    // Distance check
    const d = distance(dragNode, node.position);
    if (d > HOTZONE_RADIUS) continue;
    
    // Angle check (for smooth connections)
    const angleDiff = shortestAngleDiff(dragNode.rotation, node.rotation + 180);
    if (Math.abs(angleDiff) > MAX_ANGLE_DIFF) continue;
    
    // Best match
    if (d < bestDistance) {
      bestDistance = d;
      bestCandidate = node;
    }
  }
  
  return { targetNode: bestCandidate, isValid: bestCandidate !== null };
}
```

### 4.3 Visual Feedback

When snap is detected:
1. **Ghost Preview**: Semi-transparent copy of track at snap position
2. **Green Halo**: Glowing ring around connection point
3. **No Jerk**: Don't move the actual track until mouse release

---

## 5. Performance Strategy: Transient Updates

### 5.1 The Problem

React's reconciliation is designed for UI updates (~60 updates/minute), not game loops (~60 updates/second). Storing train positions in React state causes:
- Constant virtual DOM diffing
- Provider re-renders cascade to all consumers
- Frame drops below 60fps

### 5.2 The Solution: Zustand Transient Updates

```typescript
// Store (vanilla zustand, not react hook)
const simulationStore = createStore((set) => ({
  trainPositions: new Map<TrainId, Vector2>(),
  updateTrain: (id, pos) => set(state => {
    state.trainPositions.set(id, pos);
    return state;
  })
}));

// Component
const TrainComponent = ({ trainId }) => {
  const nodeRef = useRef<Konva.Circle>(null);
  
  useEffect(() => {
    // Subscribe OUTSIDE React's render cycle
    const unsubscribe = simulationStore.subscribe((state) => {
      const pos = state.trainPositions.get(trainId);
      if (pos && nodeRef.current) {
        // Direct canvas manipulation - NO React re-render
        nodeRef.current.position(pos);
      }
    });
    
    return unsubscribe;
  }, [trainId]);
  
  return <Circle ref={nodeRef} radius={10} fill="red" />;
};
```

**Result:** Visual updates at 60fps, React renders 0 times after mount.

---

## 6. Layer Architecture for Konva

| Layer | Content | Update Frequency | Optimization |
|-------|---------|------------------|--------------|
| Background | Grid, terrain | Once (static) | `listening={false}` |
| Track | Rails, sleepers | On edit only | `cache()` shapes |
| Shadow | Drop shadows | On edit only | Separate for perf |
| Entity | Trains, signals | 60fps | Simple shapes, transient |
| Drag | Ghost piece | User input | Only exists during drag |
| UI | Snap halos, handles | Medium | Sparse content |

---

## 7. Kato N-Scale Geometry Reference

These exact values must be in `catalog.ts`:

### Straights
| Code | Length (mm) | Usage |
|------|-------------|-------|
| 20-000 | 248 | Standard building block |
| 20-010 | 186 | Matches #6 turnout offset |
| 20-020 | 124 | Half unit |
| 20-040 | 62 | S-curve spacer |

### Curves (all 45°)
| Code | Radius (mm) | Context |
|------|-------------|---------|
| 20-170 | 216 | Minimum operational |
| 20-100 | 249 | Inner starter loop |
| 20-110 | 282 | Standard inner |
| 20-120 | 315 | Standard outer (Shinkansen) |

**Key Insight:** R315 - R282 = 33mm (standard track spacing)

---

## 8. File Format Schema

```json
{
  "version": 1,
  "metadata": {
    "name": "My Layout",
    "created": "2026-01-02T09:31:51Z"
  },
  "nodes": {
    "uuid-1": {
      "position": { "x": 100, "y": 100 },
      "rotation": 0,
      "connections": ["edge-1"]
    }
  },
  "edges": {
    "edge-1": {
      "partId": "kato-20-000",
      "startNodeId": "uuid-1",
      "endNodeId": "uuid-2",
      "geometry": { "type": "straight", "length": 248 }
    }
  }
}
```

**Future:** Compress with LZ-String for URL encoding.

---

## 9. Visual Design: Mini Metro Night Mode

From the research on Mini Metro's aesthetic:

```css
:root {
  --bg-canvas: #1A1A1A;     /* NOT pure black */
  --track-active: #00FF88;   /* Neon green */
  --track-warning: #FF9F43;  /* Orange stress */
  --train-primary: #FF6B6B;  /* Coral red */
  --ui-text: #DDDDDD;        /* Light grey */
}
```

**Principles:**
- Remove all non-functional ornamentation
- Use color to convey state, not decoration
- High contrast neon on matte dark grey
- No shadows on UI elements (flat design)

---

## 10. Key Technical Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Canvas too slow on mobile | Layer separation, shape caching |
| Snapping feels "wrong" | Tune hotzone/angle thresholds iteratively |
| Complex layouts break | Quadtree spatial indexing for O(log n) lookups |
| Save files too large | LZ-String compression for storage |
| Props re-render everything | Strict memoization, transient pattern |

---

*This synthesis document consolidates insights from 4 research documents totaling ~150,000 words into actionable technical guidance.*
