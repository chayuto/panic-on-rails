/**
 * JSON Parts Catalog Loader
 * 
 * Loads and validates JSON catalog files, transforming them
 * to PartDefinition format compatible with the existing registry.
 * 
 * Usage:
 *   import { parsePartsCatalog } from './loader';
 *   const parts = parsePartsCatalog(jsonData);
 */

import { PartCatalogFileSchema, type JsonPart } from './schemas';
import type { PartDefinition, PartBrand, PartScale, PartGeometry } from './types';
import { calculateArcLength } from './helpers';

// ===========================
// Transformation
// ===========================

/**
 * Transform a JSON part to PartDefinition format
 */
function transformToPart(
    jsonPart: JsonPart,
    brand: PartBrand,
    scale: PartScale
): PartDefinition {
    let geometry: PartGeometry;
    let defaultCost: number;

    switch (jsonPart.type) {
        case 'straight':
            geometry = { type: 'straight', length: jsonPart.length };
            // Default cost: ~$0.02 per mm, min $2
            defaultCost = Math.max(200, Math.round(jsonPart.length * 2));
            break;

        case 'curve':
            geometry = { type: 'curve', radius: jsonPart.radius, angle: jsonPart.angle };
            // Default cost: based on arc length + radius premium
            const arcLength = calculateArcLength(jsonPart.radius, jsonPart.angle);
            defaultCost = Math.max(300, Math.round(arcLength * 2 + jsonPart.radius * 0.5));
            break;

        case 'switch':
            geometry = {
                type: 'switch',
                mainLength: jsonPart.mainLength,
                branchLength: jsonPart.branchLength,
                branchAngle: jsonPart.branchAngle,
                branchDirection: jsonPart.branchDirection,
            };
            // Default cost: $15 for switches
            defaultCost = 1500;
            break;

        case 'crossing':
            geometry = {
                type: 'crossing',
                length: jsonPart.length,
                crossingAngle: jsonPart.crossingAngle,
            };
            // Default cost: $20 for crossings
            defaultCost = 2000;
            break;
    }

    return {
        id: jsonPart.id,
        name: jsonPart.name,
        brand,
        scale,
        geometry,
        cost: jsonPart.cost ?? defaultCost,
        productCode: jsonPart.productCode,
        description: jsonPart.description,
        discontinued: jsonPart.discontinued,
        referenceUrl: jsonPart.referenceUrl,
    };
}

// ===========================
// Parsing Functions
// ===========================

/**
 * Parse a JSON catalog object synchronously.
 * Use this for bundled/imported JSON files.
 * 
 * @param data - Raw JSON data to parse
 * @returns Array of PartDefinition objects
 * @throws Error if validation fails
 */
export function parsePartsCatalog(data: unknown): PartDefinition[] {
    const result = PartCatalogFileSchema.safeParse(data);

    if (!result.success) {
        const firstError = result.error.issues[0];
        console.error('[Catalog Loader] Validation failed:', result.error.issues);
        throw new Error(
            `Invalid parts catalog: ${firstError?.message ?? 'Unknown error'} ` +
            `at ${firstError?.path?.join('.') ?? 'root'}`
        );
    }

    const catalog = result.data;
    return catalog.parts.map(part => transformToPart(part, catalog.brand, catalog.scale));
}

/**
 * Parse catalog file and return with metadata
 */
export function parseCatalogWithMeta(data: unknown): {
    brand: PartBrand;
    scale: PartScale;
    parts: PartDefinition[];
} {
    const result = PartCatalogFileSchema.safeParse(data);

    if (!result.success) {
        const firstError = result.error.issues[0];
        throw new Error(
            `Invalid parts catalog: ${firstError?.message ?? 'Unknown error'}`
        );
    }

    const catalog = result.data;
    return {
        brand: catalog.brand,
        scale: catalog.scale,
        parts: catalog.parts.map(part => transformToPart(part, catalog.brand, catalog.scale)),
    };
}

// ===========================
// Async Loading
// ===========================

/**
 * Load and parse a catalog from a URL.
 * Use this for dynamic loading from CDN or server.
 * 
 * @param url - URL to fetch catalog JSON from
 * @returns Array of PartDefinition objects
 * @throws Error if fetch fails or validation fails
 */
export async function loadPartsFromURL(url: string): Promise<PartDefinition[]> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load parts catalog from ${url}: ${response.status}`);
    }

    const json = await response.json();
    return parsePartsCatalog(json);
}

/**
 * Load catalog with metadata from URL
 */
export async function loadCatalogWithMetaFromURL(url: string): Promise<{
    brand: PartBrand;
    scale: PartScale;
    parts: PartDefinition[];
}> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load parts catalog from ${url}: ${response.status}`);
    }

    const json = await response.json();
    return parseCatalogWithMeta(json);
}
