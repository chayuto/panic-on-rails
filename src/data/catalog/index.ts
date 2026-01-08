/**
 * PanicOnRails Parts Catalog
 * 
 * Main entry point for the track parts catalog.
 * 
 * Usage:
 *   import { getPartById, getPartsByScale } from '@/data/catalog';
 * 
 * Adding parts:
 *   See ./README.md for contributor guide.
 */

// Initialize registry by importing brands
import './brands';

// Export types
export type {
    PartDefinition,
    PartBrand,
    PartScale,
    PartGeometry,
    StraightGeometry,
    CurveGeometry,
    SwitchGeometry,
    CrossingGeometry,
} from './types';

// Export registry functions
export {
    getPartById,
    getPartsByScale,
    getPartsByBrand,
    getPartsByType,
    getAllParts,
    getPartCount,
    hasPartId,
    registerParts,
    clearRegistry,
} from './registry';

// Export helpers for creating new parts
export {
    straight,
    curve,
    switchPart,
    crossing,
    calculateArcLength,
} from './helpers';

// Export brand arrays for direct access
export { KATO_PARTS, BRIO_PARTS, IKEA_PARTS } from './brands';

