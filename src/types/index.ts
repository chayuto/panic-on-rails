// ===========================
// Core Identifiers
// ===========================
export type NodeId = string;
export type EdgeId = string;
export type TrainId = string;
export type PartId = string;

// ===========================
// Geometry Types
// ===========================
export interface Vector2 {
    x: number;
    y: number;
}

export interface StraightGeometry {
    type: 'straight';
    start: Vector2;
    end: Vector2;
}

export interface ArcGeometry {
    type: 'arc';
    center: Vector2;
    radius: number;
    startAngle: number; // radians
    endAngle: number;   // radians
}

export type TrackGeometry = StraightGeometry | ArcGeometry;

// ===========================
// Graph Data Structures
// ===========================

/** A connection point between track edges */
export interface TrackNode {
    id: NodeId;
    position: Vector2;
    rotation: number; // degrees, direction the connector faces
    connections: EdgeId[];
    type: 'endpoint' | 'junction' | 'switch';
    switchState?: number; // For switches: which branch is active (0, 1, ...)
}

/** A rail segment connecting two nodes */
export interface TrackEdge {
    id: EdgeId;
    partId: PartId;
    startNodeId: NodeId;
    endNodeId: NodeId;
    geometry: TrackGeometry;
    length: number; // pre-calculated for performance
}

// ===========================
// Entities
// ===========================

/** A train moving along the track graph */
export interface Train {
    id: TrainId;
    currentEdgeId: EdgeId;
    distanceAlongEdge: number; // 0 to edge.length
    direction: 1 | -1;
    speed: number; // pixels per second
    color: string;
    // Bounce animation state
    bounceTime?: number;    // Timestamp when bounce started (performance.now())
}

// ===========================
// Part Catalog
// ===========================

// Re-export from catalog for single source of truth
// Note: Individual geometry types (StraightGeometry etc) are NOT re-exported
// to avoid conflict with TrackGeometry edge types above.
export type {
    PartGeometry,
    PartBrand,
    PartScale,
    PartDefinition,
} from '../data/catalog/types';

// ===========================
// Serialization (Save/Load)
// ===========================

export interface LayoutData {
    version: number;
    metadata?: {
        name?: string;
        created?: string;
        modified?: string;
    };
    nodes: Record<NodeId, TrackNode>;
    edges: Record<EdgeId, TrackEdge>;
}

// ===========================
// Editor State
// ===========================

export type EditorMode = 'edit' | 'simulate';

export interface SnapResult {
    targetNode: TrackNode | null;
    isValid: boolean;
    distance: number;
}
