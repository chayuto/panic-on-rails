/**
 * PanicOnRails Unified Geometry Engine
 * 
 * Single source of truth for all path-based calculations.
 */

export * from './types';
export * from './engines';

// Re-export vector utils if needed by consumers
export { normalizeAngle } from '../utils/angle';
