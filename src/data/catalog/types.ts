/**
 * Extended Part Types for PanicOnRails Catalog
 * 
 * This module defines all geometry and part types.
 * Contributors: Import these types when creating new brand files.
 */

// ===========================
// Geometry Types
// ===========================

/** Straight track piece */
export interface StraightGeometry {
    type: 'straight';
    length: number; // millimeters
    /** The far end (B) is a buffer stop: not a connector, trains can't pass */
    bumper?: boolean;
}

/** Curved track piece (arc) */
export interface CurveGeometry {
    type: 'curve';
    radius: number;  // millimeters
    angle: number;   // degrees
}

/**
 * Turnout/Switch track piece
 * 
 * Modern N-scale switches use curved diverging paths with specific radii.
 * Use `branchRadius` + `branchAngle` to define the diverge geometry.
 * The `branchLength` field is deprecated but kept for backward compatibility.
 */
export interface SwitchGeometry {
    type: 'switch';
    /** Length of straight-through path (mm) */
    mainLength: number;
    /** Radius of curved diverge path (mm) - preferred over branchLength */
    branchRadius?: number;
    /** @deprecated Use branchRadius + branchAngle to calculate arc length */
    branchLength?: number;
    /** Diverge angle in degrees (typically 15° for N-Scale) */
    branchAngle: number;
    /** Direction of the diverging path */
    branchDirection: 'left' | 'right';
    /** True for symmetric wye turnouts (both paths diverge) */
    isWye?: boolean;
    /** True for passive switches (Y-splitters) where train momentum determines path */
    isPassive?: boolean;
}

/** Crossing/Diamond track piece */
export interface CrossingGeometry {
    type: 'crossing';
    length: number;         // Length of the straight-through track A (mm)
    crossingAngle: number;  // Degrees (90 for perpendicular, 45 for diagonal)
    /** Length of the crossing track B (mm). Default: `length`. */
    crossLength?: number;
}

// ===========================
// Compound Geometry (Crossovers, Scissors, Slips)
// ===========================

/** A sub-component within a compound part */
export interface CompoundSubPart {
    /** Reference to an existing catalog part ID (must be non-compound) */
    partRef: string;
    /** Position offset from compound origin (mm) */
    offset: { x: number; y: number };
    /** Rotation offset from compound's base direction (degrees) */
    rotation: number;
    /** Label for this sub-part within the compound (e.g., 'turnout-A') */
    label: string;
}

/** Defines which sub-part connectors are fused into internal joints */
export interface CompoundJoint {
    /** First endpoint */
    a: { subPart: string; connector: string };
    /** Second endpoint */
    b: { subPart: string; connector: string };
}

/** Defines which sub-part connectors are exposed externally */
export interface CompoundExternalConnector {
    /** Which sub-part this connector belongs to */
    subPart: string;
    /** The connector localId on that sub-part */
    connector: string;
    /** The external connector label (e.g., 'A1', 'A2', 'B1', 'B2') */
    externalId: string;
}

/** Compound track piece - assembled from multiple primitives */
export interface CompoundGeometry {
    type: 'compound';
    /** Sub-parts that make up this compound */
    subParts: CompoundSubPart[];
    /** Internal joints where sub-part connectors are fused */
    joints: CompoundJoint[];
    /** Connectors exposed externally for user connections */
    externalConnectors: CompoundExternalConnector[];
    /** Overall bounding dimensions for ghost preview (mm) */
    boundingBox: { width: number; height: number };
}

// ===========================
// Topology Geometry (general parts: curved turnouts, slips, scissors)
// ===========================

/** One piece of a route: a straight, or an arc turning left or right. */
export type TopologyStep =
    | { straight: number }
    | { arc: number; angle: number; turn: 'left' | 'right' };

/** A way through the piece, from one connector to another. */
export interface TopologyRoute {
    /** Connector the route starts at */
    from: string;
    /** Connector it ends at: created here if new, checked if it already exists */
    to: string;
    /** The track, in order, like a manufacturer's spec sheet: "straight 17, R583 12.9° right..." */
    path: TopologyStep[];
}

/**
 * A general track piece, described by its routes. Where two routes meet at
 * a connector there is a set of points; the earlier-listed route is the
 * points' normal position (state 0). Routes may cross each other without
 * meeting (a diamond). Covers curved turnouts, double slips and scissors
 * crossovers that the fixed geometry types can't.
 */
export interface TopologyGeometry {
    type: 'topology';
    /**
     * Connectors routes start from: position (mm) and heading INTO the
     * piece (degrees). The first is the part's primary connector.
     */
    connectors: Record<string, { x: number; y: number; heading: number }>;
    routes: TopologyRoute[];
    /**
     * Points thrown together by one control, named by connector: all four of
     * Kato's double crossover, or each end of a double slip. Linked points
     * take the same position, so list each one's normal route first. Points
     * not named here move alone.
     */
    points?: string[][];
}

/** Union of all geometry types */
export type PartGeometry =
    | StraightGeometry
    | CurveGeometry
    | SwitchGeometry
    | CrossingGeometry
    | CompoundGeometry
    | TopologyGeometry;

// ===========================
// Brand & Scale
// ===========================

/** Known track brands */
export type PartBrand =
    | 'kato'      // Kato Unitrack
    | 'marklin'   // Märklin C-track
    | 'hornby'    // Hornby Setrack
    | 'tomix'     // Tomix Fine Track
    | 'brio'      // Brio Wooden Railway
    | 'ikea'      // IKEA Lillabo
    | 'generic';  // Custom/generic parts

/** Track scales/systems */
export type PartScale =
    | 'n-scale'   // 1:160, 9mm gauge
    | 'ho-scale'  // 1:87, 16.5mm gauge (Märklin C-track)
    | 'oo-scale'  // 1:76, 16.5mm gauge (Hornby Setrack)
    | 'wooden';   // Toy wooden railways

// ===========================
// Part Definition
// ===========================

/**
 * Complete definition of a track part.
 * 
 * @example
 * const part: PartDefinition = {
 *   id: 'kato-20-000',
 *   name: 'Straight 248mm',
 *   brand: 'kato',
 *   scale: 'n-scale',
 *   geometry: { type: 'straight', length: 248 }
 * };
 */
export interface PartDefinition {
    /** Unique identifier (format: brand-productcode) */
    id: string;

    /** Display name */
    name: string;

    /** Manufacturer brand */
    brand: PartBrand;

    /** Track scale/system */
    scale: PartScale;

    /** Geometry specification */
    geometry: PartGeometry;

    /**
     * Price of one piece in the hobby shop, in US cents: roughly the 2025
     * street price (a 4-pack's price / 4 for track sold in packs).
     */
    cost: number;

    // === Optional Metadata ===

    /** Real product SKU (e.g., "20-000") */
    productCode?: string;

    /** Description for tooltips */
    description?: string;

    /** Mark discontinued products */
    discontinued?: boolean;

    /** URL to product page or documentation */
    referenceUrl?: string;

    /**
     * Footprint width across the track (mm): the roadbed, or wider for pieces
     * like a road crossing. Set from the catalog file's `trackWidth` unless
     * the part overrides it.
     */
    width?: number;

    /** Width of the system's roadbed (mm): the catalog file's `trackWidth`. */
    roadbedWidth?: number;

    /** The piece carries road-crossing plates as wide as `width` */
    roadCrossing?: boolean;

    /** Where the part sits in the parts bin. Default: from its geometry. */
    category?: PartCategory;
}

/** Parts-bin section a part belongs to. */
export type PartCategory = 'straight' | 'curve' | 'turnout' | 'crossing' | 'bumper';

// ===========================
// Re-exports for convenience
// ===========================

// These match the original types/index.ts for compatibility
export type { PartDefinition as Part };
