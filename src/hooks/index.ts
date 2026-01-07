/**
 * Hooks - Barrel Export
 *
 * Re-exports all custom hooks for clean imports.
 */

// Canvas coordinate utilities
export { useCanvasCoordinates } from './useCanvasCoordinates';
export { useCanvasViewport } from './useCanvasViewport';

// Edge geometry
export { useEdgeGeometry, getEdgeWorldGeometry } from './useEdgeGeometry';

// Visible elements
export { useVisibleEdges } from './useVisibleEdges';

// Mode handlers
export { useEditModeHandler } from './useEditModeHandler';
export { useSimulateModeHandler } from './useSimulateModeHandler';

// Connect mode
export { useConnectMode } from './useConnectMode';

// Game loop
export { useGameLoop } from './useGameLoop';

// Keyboard shortcuts
export { useKeyboardShortcuts } from './useKeyboardShortcuts';

// Hover detection
export { useHoveredElement } from './useHoveredElement';

// Performance metrics
export { usePerformanceMetrics } from './usePerformanceMetrics';
