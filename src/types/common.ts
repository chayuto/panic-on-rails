/**
 * Common Types and Identifiers
 */

export type NodeId = string;
export type EdgeId = string;
export type TrainId = string;
export type PartId = string;

export interface Vector2 {
    x: number;
    y: number;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
