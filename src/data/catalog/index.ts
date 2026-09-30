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

// Export registry functions
export {
    getPartById,
    getPartsByScale,
    getPartsByBrand,
    getAllParts,
} from './registry';

// Export part helpers
export { calculateArcLength, partCategory } from './helpers';
