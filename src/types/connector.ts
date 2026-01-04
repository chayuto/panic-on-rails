/**
 * Multi-Node Connector System for Track Pieces
 * 
 * This module defines the connector-based architecture for snapping track pieces.
 * Each track piece has multiple connector nodes, and snapping works by mating
 * connectors with 180° opposite facades.
 */

import type { Vector2 } from './index';

// ===========================
// Connector Node Definition
// ===========================

/**
 * A connection point on a track piece.
 * 
 * Each connector has a local position (relative to the part's placement origin)
 * and a facade direction (the direction it "faces" outward).
 * 
 * For two connectors to mate, their facades must face 180° opposite (±tolerance).
 */
export interface ConnectorNode {
    /** 
     * Local ID within the part (e.g., 'A', 'B', 'main', 'branch').
     * Must be unique within a single part definition.
     */
    localId: string;

    /** 
     * Position relative to part origin (0,0 = placement point).
     * When the part is placed at world position P with rotation R,
     * this position is transformed to world coordinates.
     */
    localPosition: Vector2;

    /** 
     * Facade direction in local coordinates (degrees, 0° = right/east).
     * This is the direction the connector "faces" - outward from the track.
     * When the part is rotated, this angle is also rotated.
     * 
     * Convention: For a straight track going left-to-right,
     * - Left connector facade = 180° (faces left/west)
     * - Right connector facade = 0° (faces right/east)
     */
    localFacade: number;

    /** 
     * Maximum connections allowed at this node.
     * - 1: Standard endpoint (most common)
     * - 2: Special cases like crossing center junctions
     */
    maxConnections: 1 | 2;
}

// ===========================
// Part Connectors Definition
// ===========================

/**
 * Collection of all connectors on a track part.
 */
export interface PartConnectors {
    /** All connector nodes on this part */
    nodes: ConnectorNode[];

    /** 
     * ID of the primary/default node (which node the cursor follows during drag).
     * This is typically the "entry" or "start" node of the part.
     */
    primaryNodeId: string;
}

// ===========================
// World-Space Connector
// ===========================

/**
 * A connector node transformed to world coordinates.
 * Used during snap calculations.
 */
export interface WorldConnector {
    /** Reference to the original local ID */
    localId: string;

    /** World position after applying part transform */
    worldPosition: Vector2;

    /** World facade direction after applying part rotation (degrees) */
    worldFacade: number;

    /** Max connections (copied from definition) */
    maxConnections: 1 | 2;
}

// ===========================
// Snap Result Types
// ===========================

/**
 * Result of a successful snap match.
 */
export interface SnapMatchResult {
    /** ID of the connector on the ghost/new part that's snapping */
    ghostConnectorId: string;

    /** ID of the target node being snapped to */
    targetNodeId: string;

    /** Position of the target node */
    targetPosition: Vector2;

    /** Rotation of the target node's facade */
    targetFacade: number;

    /** Distance between ghost connector and target (for scoring) */
    distance: number;

    /** 
     * Required ghost transform to achieve this snap.
     * Placing the ghost at this position/rotation will align the 
     * ghost connector with the target node.
     */
    ghostTransform: {
        position: Vector2;
        rotation: number;
    };
}

// ===========================
// Snap Configuration
// ===========================

/**
 * Configuration for snapping behavior.
 */
export interface SnapConfig {
    /** Maximum distance for snap detection (pixels) */
    snapRadius: number;

    /** Maximum angle tolerance for facade matching (degrees from 180°) */
    angleTolerance: number;
}

/**
 * Default snap configurations by track system.
 */
export const DEFAULT_SNAP_CONFIG: Record<'n-scale' | 'wooden', SnapConfig> = {
    'n-scale': {
        snapRadius: 30,
        angleTolerance: 15,  // ±15° from perfect 180°
    },
    'wooden': {
        snapRadius: 40,
        angleTolerance: 20,  // More forgiving for wooden track
    },
};
