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
    length: number;         // Length of each track (mm)
    crossingAngle: number;  // Degrees (90 for perpendicular, 45 for diagonal)
}

/** Union of all geometry types */
export type PartGeometry =
    | StraightGeometry
    | CurveGeometry
    | SwitchGeometry
    | CrossingGeometry;

// ===========================
// Brand & Scale
// ===========================

/** Known track brands */
export type PartBrand =
    | 'kato'      // Kato Unitrack
    | 'tomix'     // Tomix Fine Track
    | 'brio'      // Brio Wooden Railway
    | 'ikea'      // IKEA Lillabo
    | 'generic';  // Custom/generic parts

/** Track scales/systems */
export type PartScale =
    | 'n-scale'   // 1:160, 9mm gauge
    | 'ho-scale'  // 1:87, 16.5mm gauge
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

    /** Cost in game currency (cents for precision) */
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
}

// ===========================
// Re-exports for convenience
// ===========================

// These match the original types/index.ts for compatibility
export type { PartDefinition as Part };
