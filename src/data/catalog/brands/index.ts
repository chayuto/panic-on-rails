/**
 * Brand Auto-Import (JSON-based)
 * 
 * This file imports JSON catalog files and registers their parts.
 * When adding a new brand, add a JSON file to ../parts/ and import here.
 * 
 * Migration Note: TypeScript brand files (kato.ts, brio.ts) are now
 * deprecated. Use JSON files in ../parts/ instead.
 */

import { registerParts } from '../registry';
import { parsePartsCatalog } from '../loader';

// Import JSON catalog files
import katoJson from '../parts/kato.json';
import brioJson from '../parts/brio.json';
import ikeaJson from '../parts/ikea.json';

// Parse and register all brands
const KATO_PARTS = parsePartsCatalog(katoJson);
const BRIO_PARTS = parsePartsCatalog(brioJson);
const IKEA_PARTS = parsePartsCatalog(ikeaJson);

registerParts(KATO_PARTS);
registerParts(BRIO_PARTS);
registerParts(IKEA_PARTS);

// Re-export for backward compatibility
// @deprecated Use getPartsByBrand('kato') instead
export { KATO_PARTS };
// @deprecated Use getPartsByBrand('brio') instead
export { BRIO_PARTS };
// @deprecated Use getPartsByBrand('ikea') instead
export { IKEA_PARTS };
