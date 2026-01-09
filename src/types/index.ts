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
    PartGeometry,
    PartBrand,
    PartScale,
    PartDefinition,
} from '../data/catalog/types';

// ===========================
// Mode System (New)
// ===========================

// Re-export from mode types for single source of truth
export type {
    PrimaryMode,
    EditSubMode,
    SimulateSubMode,
    ModeState,
} from './mode';

export {
    DEFAULT_MODE_STATE,
    isPrimaryMode,
    isEditSubMode,
    isSimulateSubMode,
} from './mode';

// ===========================
// Logic Components
// ===========================

// Re-export from logic types
export type {
    SensorId,
    SignalId,
    WireId,
    LogicState,
    SignalState,
    Sensor,
    Signal,
    Wire,
    WireAction,
    LogicLayoutData,
} from './logic';

// ===========================
// Connector System (Multi-Node)
// ===========================

// Re-export from connector types
export type {
    ConnectorNode,
    PartConnectors,
    WorldConnector,
    SnapMatchResult,
    SnapConfig,
} from './connector';

export { DEFAULT_SNAP_CONFIG } from './connector';
