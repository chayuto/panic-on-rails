/**
 * @deprecated This file is deprecated. 
 * Import from './catalog' instead.
 * 
 * This file exists for backward compatibility and re-exports
 * the new modular catalog API.
 */

// Re-export everything from the new modular catalog
export {
    getPartById,
    getPartsByScale,
    getAllParts,
    calculateArcLength,
} from './catalog/index';

export type { PartDefinition } from './catalog/types';

// Legacy exports for backward compatibility
import { getAllParts } from './catalog/index';
import { KATO_PARTS, BRIO_PARTS } from './catalog/brands/index';

/** @deprecated Use getAllParts() instead */
export const ALL_PARTS = getAllParts();

/** @deprecated Use getPartsByScale('n-scale') instead */
export const PART_LIBRARY = KATO_PARTS;

/** @deprecated Use getPartsByScale('wooden') instead */
export const WOODEN_LIBRARY = BRIO_PARTS;
