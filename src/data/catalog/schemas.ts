/**
 * Zod Schemas for JSON Parts Catalog Validation
 * 
 * These schemas validate JSON catalog files at runtime,
 * providing helpful error messages for invalid data.
 * 
 * Usage:
 *   import { PartCatalogFileSchema } from './schemas';
 *   const result = PartCatalogFileSchema.safeParse(jsonData);
 */

import { z } from 'zod';

// ===========================
// Common Fields
// ===========================

const OptionalPartFields = {
    cost: z.number().int().positive().optional(),
    productCode: z.string().optional(),
    description: z.string().optional(),
    discontinued: z.boolean().optional(),
    referenceUrl: z.string().url().optional(),
};

// ===========================
// Part Type Schemas
// ===========================

/**
 * Straight track piece schema
 */
export const StraightPartSchema = z.object({
    id: z.string().min(1, 'Part ID is required'),
    name: z.string().min(1, 'Part name is required'),
    type: z.literal('straight'),
    length: z.number().positive('Length must be positive'),
    ...OptionalPartFields,
});

/**
 * Curved track piece schema
 */
export const CurvePartSchema = z.object({
    id: z.string().min(1, 'Part ID is required'),
    name: z.string().min(1, 'Part name is required'),
    type: z.literal('curve'),
    radius: z.number().positive('Radius must be positive'),
    angle: z.number().positive('Angle must be positive').max(360, 'Angle must be <= 360'),
    ...OptionalPartFields,
});

/**
 * Switch/Turnout track piece schema
 */
export const SwitchPartSchema = z.object({
    id: z.string().min(1, 'Part ID is required'),
    name: z.string().min(1, 'Part name is required'),
    type: z.literal('switch'),
    mainLength: z.number().positive('Main length must be positive'),
    branchLength: z.number().positive('Branch length must be positive'),
    branchAngle: z.number().positive('Branch angle must be positive'),
    branchDirection: z.enum(['left', 'right']),
    ...OptionalPartFields,
});

/**
 * Crossing/Diamond track piece schema
 */
export const CrossingPartSchema = z.object({
    id: z.string().min(1, 'Part ID is required'),
    name: z.string().min(1, 'Part name is required'),
    type: z.literal('crossing'),
    length: z.number().positive('Length must be positive'),
    crossingAngle: z.number().positive('Crossing angle must be positive').max(180),
    ...OptionalPartFields,
});

// ===========================
// Combined Part Schema
// ===========================

/**
 * Union of all part types using discriminated union
 */
export const PartSchema = z.discriminatedUnion('type', [
    StraightPartSchema,
    CurvePartSchema,
    SwitchPartSchema,
    CrossingPartSchema,
]);

// ===========================
// Catalog File Schema
// ===========================

/**
 * Brand enum matching PartBrand type
 */
export const PartBrandSchema = z.enum(['kato', 'tomix', 'brio', 'ikea', 'generic']);

/**
 * Scale enum matching PartScale type
 */
export const PartScaleSchema = z.enum(['n-scale', 'ho-scale', 'wooden']);

/**
 * Complete parts catalog file schema
 */
export const PartCatalogFileSchema = z.object({
    $schema: z.string().optional(),
    version: z.number().int().positive('Version must be positive integer'),
    brand: PartBrandSchema,
    scale: PartScaleSchema,
    parts: z.array(PartSchema).min(1, 'At least one part is required'),
});

// ===========================
// Type Inference
// ===========================

/** Inferred type for a single part from JSON */
export type JsonPart = z.infer<typeof PartSchema>;

/** Inferred type for straight part from JSON */
export type JsonStraightPart = z.infer<typeof StraightPartSchema>;

/** Inferred type for curve part from JSON */
export type JsonCurvePart = z.infer<typeof CurvePartSchema>;

/** Inferred type for switch part from JSON */
export type JsonSwitchPart = z.infer<typeof SwitchPartSchema>;

/** Inferred type for crossing part from JSON */
export type JsonCrossingPart = z.infer<typeof CrossingPartSchema>;

/** Inferred type for complete catalog file */
export type PartCatalogFile = z.infer<typeof PartCatalogFileSchema>;
