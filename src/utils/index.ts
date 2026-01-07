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
    getCarriagePositions,
    getBounceScale,
    lightenColor,
    BOUNCE_DURATION,
    type CarriagePosition,
} from './trainGeometry';

// Connection utilities
export { getNodeFacadeFromEdge } from './connectTransform';

// Snap utilities
export { findOpenEndpoints, getConnectorById } from './snapManager';

// Logging
export { logger, type LogLevel, type LoggerConfig, type ScopedLogger } from './logger';

