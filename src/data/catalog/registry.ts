/**
 * Parts Registry - Centralized catalog management
 * 
 * This module handles registration and lookup of track parts.
 * Brand files register their parts here at import time.
 */

import type { PartDefinition, PartScale, PartBrand } from './types';

// The global parts registry
const registry: Map<string, PartDefinition> = new Map();

// ===========================
// Registration
// ===========================

/**
 * Register parts from a brand file.
 * Called automatically when brand files are imported.
 * 
 * @param parts - Array of parts to register
 * @throws Warning if duplicate part ID found
 */
export function registerParts(parts: PartDefinition[]): void {
    for (const part of parts) {
        if (registry.has(part.id)) {
            console.warn(`[Catalog] Duplicate part ID: ${part.id}`);
        }
        registry.set(part.id, part);
    }
}

/**
 * Clear all registered parts (useful for testing)
 */
export function clearRegistry(): void {
    registry.clear();
}

// ===========================
// Lookup Functions
// ===========================

/**
 * Get a part by its unique ID
 * 
 * @param id - Part ID (e.g., 'kato-20-000')
 * @returns Part definition or undefined if not found
 */
export function getPartById(id: string): PartDefinition | undefined {
    return registry.get(id);
}

/**
 * Get all parts for a specific scale/system
 * 
 * @param scale - 'n-scale', 'ho-scale', or 'wooden'
 */
export function getPartsByScale(scale: PartScale): PartDefinition[] {
    return Array.from(registry.values()).filter(p => p.scale === scale);
}

/**
 * Get all parts for a specific brand
 * 
 * @param brand - 'kato', 'tomix', 'brio', etc.
 */
export function getPartsByBrand(brand: PartBrand): PartDefinition[] {
    return Array.from(registry.values()).filter(p => p.brand === brand);
}

/**
 * Get all registered parts
 */
export function getAllParts(): PartDefinition[] {
    return Array.from(registry.values());
}

/**
 * Get count of registered parts
 */
export function getPartCount(): number {
    return registry.size;
}

// ===========================
// Query Helpers
// ===========================

/**
 * Get parts filtered by geometry type
 * 
 * @param type - 'straight', 'curve', 'switch', or 'crossing'
 */
export function getPartsByType(type: PartDefinition['geometry']['type']): PartDefinition[] {
    return Array.from(registry.values()).filter(p => p.geometry.type === type);
}

/**
 * Check if a part ID exists
 */
export function hasPartId(id: string): boolean {
    return registry.has(id);
}
