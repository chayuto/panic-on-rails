import { z } from 'zod';

const Vector2Schema = z.object({
    x: z.number(),
    y: z.number(),
});

const TrackNodeSchema = z.object({
    id: z.string(),
    position: Vector2Schema,
    rotation: z.number(), // Allow any rotation, but typically 0-360
    connections: z.array(z.string()),
    type: z.enum(['endpoint', 'junction', 'switch']),
    switchState: z.union([z.literal(0), z.literal(1)]).optional(),
    switchBranches: z.tuple([z.string(), z.string()]).optional(),
});

const TrackEdgeSchema = z.object({
    id: z.string(),
    partId: z.string(),
    startNodeId: z.string(),
    endNodeId: z.string(),
    geometry: z.discriminatedUnion('type', [
        z.object({ type: z.literal('straight'), start: Vector2Schema, end: Vector2Schema }),
        z.object({ type: z.literal('arc'), center: Vector2Schema, radius: z.number(), startAngle: z.number(), endAngle: z.number() }),
    ]),
    intrinsicGeometry: z.union([
        z.object({ type: z.literal('straight'), length: z.number() }),
        z.object({ type: z.literal('arc'), radius: z.number(), sweepAngle: z.number(), direction: z.enum(['cw', 'ccw']) }),
    ]).optional(), // Optional for now to support legacy, but good to have
    length: z.number(), // Required, matching TypeScript TrackEdge
    placementId: z.string().optional(), // Shared ID for compound part edges
});

export const LayoutDataSchema = z.object({
    version: z.number(),
    metadata: z.object({
        name: z.string().optional(),
        created: z.string().optional(),
        modified: z.string().optional(),
        buildTime: z.string().optional(),
    }).optional(),
    nodes: z.record(z.string(), TrackNodeSchema),
    edges: z.record(z.string(), TrackEdgeSchema),
    debug: z.object({
        facades: z.record(z.string(), z.any()),
        partNames: z.record(z.string(), z.string()),
    }).optional(),
});

export type ValidatedLayoutData = z.infer<typeof LayoutDataSchema>;
