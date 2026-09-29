/**
 * Utilities - Barrel Export
 *
 * Re-exports utility modules for clean imports.
 *
 * @example
 * ```typescript
 * import { normalizeAngle, SpatialHashGrid } from '@/utils';
 * ```
 */

// Geometry utilities
export {
    normalizeAngle,
    angleDifference,
    deriveWorldGeometry,
} from './geometry';

// Spatial indexing
export {
    SpatialHashGrid,
    boundingBoxFromPoints,
    boundingBoxFromArc,
    type BoundingBox,
} from './spatialHashGrid';

// Train utilities
export {
    getPositionOnEdge,
    getRotationOnEdge,
} from './trainGeometry';
export { getCarPoses, type CarPose } from './trainCars';

// Connection utilities
export { getNodeFacadeFromEdge } from './connectTransform';

// Snap utilities
export { findOpenEndpoints, getConnectorById } from './snapManager';

// Logging
export { logger, type LogLevel, type LoggerConfig, type ScopedLogger } from './logger';

