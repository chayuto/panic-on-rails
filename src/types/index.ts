/**
 * Type Definitions - Main Export
 */

// Feature Modules
export * from './common';
export * from './geometry';
export * from './graph';
export * from './train';
export * from './serialization';

// ===========================
// Part Catalog
// ===========================

// Re-export from catalog for single source of truth
export type {
    PartBrand,
    PartScale,
    PartDefinition,
} from '../data/catalog/types';

// ===========================
// Logic Components
// ===========================

// Re-export from logic types
export type {
    SensorId,
    SignalId,
    WireId,
    StationId,
    Station,
    LogicState,
    SignalState,
    Sensor,
    Signal,
    Wire,
    WireAction,
} from './logic';

// ===========================
// Connector System (Multi-Node)
// ===========================

// Re-export from connector types
export type {
    ConnectorNode,
    WorldConnector,
    SnapMatchResult,
} from './connector';

export { DEFAULT_SNAP_CONFIG } from './connector';
