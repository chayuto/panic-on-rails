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
 * 
 * Supports both legacy `branchLength` and modern `branchRadius` geometry.
 * At least one must be provided for valid switch geometry.
 */
const SwitchPartBaseSchema = z.object({
    id: z.string().min(1, 'Part ID is required'),
    name: z.string().min(1, 'Part name is required'),
    type: z.literal('switch'),
    mainLength: z.number().positive('Main length must be positive'),
    branchRadius: z.number().positive('Branch radius must be positive').optional(),
    branchLength: z.number().positive('Branch length must be positive').optional(),
    branchAngle: z.number().positive('Branch angle must be positive').max(90, 'Branch angle must be <= 90'),
    branchDirection: z.enum(['left', 'right']),
    isWye: z.boolean().optional(),
    isPassive: z.boolean().optional(),
    ...OptionalPartFields,
});

export const SwitchPartSchema = SwitchPartBaseSchema.refine(
    (data) => data.branchRadius !== undefined || data.branchLength !== undefined,
    { message: 'At least one of branchRadius or branchLength must be provided' }
);

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
// Compound Part Schemas
// ===========================

const CompoundSubPartSchema = z.object({
    partRef: z.string().min(1, 'Sub-part reference is required'),
    offset: z.object({ x: z.number(), y: z.number() }),
    rotation: z.number(),
    label: z.string().min(1, 'Sub-part label is required'),
});

const CompoundJointSchema = z.object({
    a: z.object({ subPart: z.string(), connector: z.string() }),
    b: z.object({ subPart: z.string(), connector: z.string() }),
});

const CompoundExternalConnectorSchema = z.object({
    subPart: z.string(),
    connector: z.string(),
    externalId: z.string().min(1),
});

/**
 * Compound track piece schema (crossovers, scissors, slips)
 */
const CompoundPartBaseSchema = z.object({
    id: z.string().min(1, 'Part ID is required'),
    name: z.string().min(1, 'Part name is required'),
    type: z.literal('compound'),
    subParts: z.array(CompoundSubPartSchema).min(2, 'Compound must have at least 2 sub-parts'),
    joints: z.array(CompoundJointSchema).min(1, 'Compound must have at least 1 internal joint'),
    externalConnectors: z.array(CompoundExternalConnectorSchema).min(2, 'Compound must expose at least 2 connectors'),
    boundingBox: z.object({ width: z.number().positive(), height: z.number().positive() }),
    ...OptionalPartFields,
});

// ===========================
// Combined Part Schema
// ===========================

/**
 * Union of all part types using discriminated union on 'type'.
 * Cross-field refinements (e.g., switch branchRadius/branchLength) are applied via superRefine.
 */
export const PartSchema = z.discriminatedUnion('type', [
    StraightPartSchema,
    CurvePartSchema,
    SwitchPartBaseSchema,
    CrossingPartSchema,
    CompoundPartBaseSchema,
]).superRefine((data, ctx) => {
    if (data.type === 'switch') {
        if (data.branchRadius === undefined && data.branchLength === undefined) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one of branchRadius or branchLength must be provided',
            });
        }
    }
});

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

/** Inferred type for compound part from JSON */
export type JsonCompoundPart = z.infer<typeof CompoundPartBaseSchema>;

/** Inferred type for complete catalog file */
export type PartCatalogFile = z.infer<typeof PartCatalogFileSchema>;
