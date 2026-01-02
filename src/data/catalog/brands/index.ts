/**
 * Brand Auto-Import
 * 
 * This file imports all brand files and registers their parts.
 * When adding a new brand, import it here.
 */

import { registerParts } from '../registry';

// Import brand part arrays
import { KATO_PARTS } from './kato';
import { BRIO_PARTS } from './brio';
// import { TOMIX_PARTS } from './tomix';
// import { IKEA_PARTS } from './ikea';

// Register all brands
registerParts(KATO_PARTS);
registerParts(BRIO_PARTS);
// registerParts(TOMIX_PARTS);
// registerParts(IKEA_PARTS);

// Re-export for direct access if needed
export { KATO_PARTS } from './kato';
export { BRIO_PARTS } from './brio';
