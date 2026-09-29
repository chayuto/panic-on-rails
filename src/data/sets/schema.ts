/**
 * Zod schema for boxed-set JSON files (`src/data/sets/<brand>/*.json`).
 */

import { z } from 'zod';
import { PartBrandSchema, PartScaleSchema } from '../catalog/schemas';

const PlanAnchorSchema = z.object({
    piece: z.number().int().nonnegative(),
    connector: z.string().min(1),
});

const PlanAlongsideSchema = z.object({
    alongside: z.number().int().nonnegative(),
    offset: z.number(),
});

const PlanStepSchema = z.object({
    part: z.string().min(1),
    at: z.union([z.number().int().nonnegative(), PlanAnchorSchema, PlanAlongsideSchema]).optional(),
    via: z.string().min(1).optional(),
});

const LayoutPlanSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    steps: z.array(PlanStepSchema).min(1),
    trains: z.array(z.object({
        piece: z.number().int().nonnegative(),
        color: z.string().optional(),
    })).optional(),
    openEnds: z.number().int().nonnegative().optional(),
});

export const TrackSetSchema = z.object({
    $schema: z.string().optional(),
    id: z.string().min(1),
    brand: PartBrandSchema,
    scale: PartScaleSchema,
    productCode: z.string().min(1),
    badge: z.string().optional(),
    name: z.string().min(1),
    kind: z.enum(['starter', 'expansion']),
    description: z.string().min(1),
    contents: z.array(z.object({
        part: z.string().min(1),
        qty: z.number().int().positive(),
    })).min(1),
    accessories: z.array(z.string()).optional(),
    extends: z.array(z.string()).optional(),
    footprint: z.object({ width: z.number().positive(), depth: z.number().positive() }).optional(),
    plans: z.array(LayoutPlanSchema).min(1),
    referenceUrl: z.string().url().optional(),
});
