# Railway Physics Domain Knowledge

## Track Network as Graph

The track layout is modeled as a **directed graph**:
- **Nodes (V)**: Connection points, switches, endpoints
- **Edges (E)**: Track segments (straight or curved)

Trains traverse edges, changing direction at nodes based on connectivity.

## Track Geometry Types

### Straight Tracks
- Defined by length (in mm or pixels)
- Two connectors at each end
- Bidirectional - trains can travel either way

### Curved Tracks
- Defined by radius and sweep angle
- Use arc geometry for rendering
- Trains follow constant arc-length traversal

### Switches (Turnouts)
- Three connectors: entry, main, branch
- State determines which route is active
- Only one route active at a time

## Train Movement

### Position Representation
- `edgeId`: Current track segment
- `distanceAlongEdge`: Position on segment (0 to length)
- `direction`: +1 (forward) or -1 (backward)

### Edge Transitions
1. Train reaches edge boundary (distance < 0 or > length)
2. Query exit node for connected edges
3. Select next edge (respecting switch state if applicable)
4. Determine new direction based on entry point

## Collision Detection

Trains occupy positions on edges. Collision occurs when:
- Two trains on same edge with overlapping positions
- Head-on collision at node transition

## Angle Conventions

ALL angles are in DEGREES, normalized to [0, 360):
- 0° = East (right)
- 90° = South (down)
- 180° = West (left)
- 270° = North (up)

See `docs/architecture/constitution.md` for complete rules.
