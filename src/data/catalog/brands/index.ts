/**
 * Brand Auto-Import (JSON-based)
 * 
 * This file imports JSON catalog files and registers their parts.
 * When adding a new brand, add a JSON file to ../parts/ and import here.
 */

import { registerParts } from '../registry';
import { parsePartsCatalog } from '../loader';

// Import JSON catalog files
import katoJson from '../parts/kato.json';
import brioJson from '../parts/brio.json';
import ikeaJson from '../parts/ikea.json';
import marklinJson from '../parts/marklin.json';
import hornbyJson from '../parts/hornby.json';
import bachmannJson from '../parts/bachmann.json';

// Parse and register all brands
const KATO_PARTS = parsePartsCatalog(katoJson);
const BRIO_PARTS = parsePartsCatalog(brioJson);
const IKEA_PARTS = parsePartsCatalog(ikeaJson);
const MARKLIN_PARTS = parsePartsCatalog(marklinJson);
const HORNBY_PARTS = parsePartsCatalog(hornbyJson);
const BACHMANN_PARTS = parsePartsCatalog(bachmannJson);

registerParts(KATO_PARTS);
registerParts(BRIO_PARTS);
registerParts(IKEA_PARTS);
registerParts(MARKLIN_PARTS);
registerParts(HORNBY_PARTS);
registerParts(BACHMANN_PARTS);
