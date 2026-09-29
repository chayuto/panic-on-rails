# Graph Theory Reference for Track Networks

## Core Concepts

### Vertices (Nodes)
Each node has:
- Position (x, y)
- Rotation (facade direction in degrees)
- Type: endpoint, junction, switch
- Connections: list of connected edge IDs

### Edges
Each edge has:
- Start node ID
- End node ID
- Length (for distance calculations)
- Geometry (straight or arc)

## Common Algorithms

### Connectivity Check (BFS)
```typescript
function isConnected(startNodeId, endNodeId, nodes, edges): boolean {
    const visited = new Set<NodeId>();
    const queue = [startNodeId];
    
    while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === endNodeId) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        
        // Add neighbors
        for (const edgeId of nodes[current].connections) {
            const edge = edges[edgeId];
            const neighbor = edge.startNodeId === current 
                ? edge.endNodeId 
                : edge.startNodeId;
            queue.push(neighbor);
        }
    }
    return false;
}
```

### Shortest Path (Dijkstra)
For route planning, treat edge.length as weight.

### Cycle Detection
Track networks often form loops. BFS/DFS with visited tracking handles this.

## Switch Handling

Switches add complexity:
- Multiple outgoing edges from entry node
- Only one edge is "active" based on switch state
- Routing must respect switch positions

## Data Structures

### Adjacency List (Current Approach)
Each node stores its connected edge IDs. Efficient for sparse graphs like rail networks.

### Spatial Hash Grid
Used for fast proximity queries during snapping. Grid cells store references to nearby nodes/edges.
