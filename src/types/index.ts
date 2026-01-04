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
    // Switch-specific fields
    switchState?: 0 | 1;           // 0 = main path, 1 = branch path
    switchBranches?: [EdgeId, EdgeId]; // [mainEdgeId, branchEdgeId] - exit edges
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
    // Crash state
    crashed?: boolean;      // True if train has crashed
    crashTime?: number;     // Timestamp when crash occurred
    // Multi-car train properties
    carriageCount?: number;    // Number of carriages (default 1 = locomotive only)
    carriageSpacing?: number;  // Distance between carriage centers in pixels (default 30)
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
        buildTime?: string;  // Build timestamp when app was compiled
    };
    nodes: Record<NodeId, TrackNode>;
    edges: Record<EdgeId, TrackEdge>;
}

// ===========================
// Editor State
// ===========================

/**
 * @deprecated Use PrimaryMode and EditSubMode from './mode' instead.
 * This type will be removed in a future version after migration.
 * 
 * Migration mapping:
 * - 'edit' -> primaryMode: 'edit', editSubMode: 'select'
 * - 'simulate' -> primaryMode: 'simulate'
 * - 'sensor' -> primaryMode: 'edit', editSubMode: 'sensor'
 * - 'signal' -> primaryMode: 'edit', editSubMode: 'signal'
 * - 'wire' -> primaryMode: 'edit', editSubMode: 'wire'
 * - 'delete' -> primaryMode: 'edit', editSubMode: 'delete'
 */
export type EditorMode = 'edit' | 'simulate' | 'sensor' | 'signal' | 'wire' | 'delete';

export interface SnapResult {
    targetNode: TrackNode | null;
    isValid: boolean;
    distance: number;
}

// ===========================
// Mode System (New)
// ===========================

// Re-export from mode types for single source of truth
export type {
    PrimaryMode,
    EditSubMode,
    SimulateSubMode,
    ModeState,
} from './mode';

export {
    DEFAULT_MODE_STATE,
    isPrimaryMode,
    isEditSubMode,
    isSimulateSubMode,
    LEGACY_MODE_MAPPING,
} from './mode';

// ===========================
// Logic Components
// ===========================

// Re-export from logic types
export type {
    SensorId,
    SignalId,
    WireId,
    LogicState,
    SignalState,
    Sensor,
    Signal,
    Wire,
    WireAction,
    LogicLayoutData,
} from './logic';
