import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { EdgeId, PartId, Vector2, NodeId, SensorId, SignalId } from '../types';

// Snap result when near an open endpoint
export interface SnapResult {
    targetNodeId: NodeId;
    targetPosition: Vector2;
    targetRotation: number; // degrees
    distance: number;
}

export interface GhostState {
    position: Vector2;
    rotation: number;
    valid: boolean;
}

// Transient state storage (outside Zustand to avoid re-renders)
const ghostRef = { current: null as GhostState | null };

interface EditorState {
    // Selection state
    selectedEdgeId: EdgeId | null;
    selectedPartId: PartId;
    selectedSystem: 'n-scale' | 'wooden';

    // Viewport
    showGrid: boolean;
    showMeasurements: boolean;
    zoom: number;
    pan: Vector2;

    // Drag-and-drop state
    draggedPartId: PartId | null;
    ghostPosition: Vector2 | null;
    ghostRotation: number;    // Visual rotation (may be snapped)
    userRotation: number;     // User's intended rotation (persists across snaps)
    ghostValid: boolean;

    // Snap state
    snapTarget: SnapResult | null;

    // Wire creation state
    wireSource: {
        type: 'sensor' | 'signal';
        id: SensorId | SignalId;
    } | null;

    // Connect mode state
    connectSource: {
        nodeId: NodeId;
        edgeId: EdgeId;
    } | null;
}

interface EditorActions {
    // Selection actions

    /**
     * Set the currently selected track edge.
     * 
     * @param edgeId - ID of the edge to select, or null to deselect
     */
    setSelectedEdge: (edgeId: EdgeId | null) => void;

    /**
     * Set the currently selected part in the catalog.
     * 
     * @param partId - ID of the catalog part (e.g., 'kato-20-000')
     */
    setSelectedPart: (partId: PartId) => void;

    /**
     * Switch the active track system catalog.
     * 
     * @param system - Track system ('n-scale' | 'wooden')
     */
    setSelectedSystem: (system: 'n-scale' | 'wooden') => void;

    // Viewport actions

    /**
     * Toggle visibility of the background grid.
     */
    toggleGrid: () => void;

    /**
     * Toggle visibility of measurement overlays.
     */
    toggleMeasurements: () => void;

    /**
     * Set the viewport zoom level.
     * Clamped between 0.1 and 5.0.
     * 
     * @param zoom - Zoom multiplier (1 = 100%)
     */
    setZoom: (zoom: number) => void;

    /**
     * Set the viewport pan offset.
     * 
     * @param x - Horizontal offset in pixels
     * @param y - Vertical offset in pixels
     */
    setPan: (x: number, y: number) => void;

    /**
     * Reset viewport to default zoom (1) and pan (0,0).
     */
    resetView: () => void;

    // Drag actions

    /**
     * Begin dragging a new part from the catalog.
     * Initializes ghost state.
     * 
     * @param partId - ID of the part being dragged
     */
    startDrag: (partId: PartId) => void;

    /**
     * Update the ghost preview position and rotation.
     * 
     * @param position - New world position
     * @param rotation - Rotation in degrees
     * @param valid - Whether the placement is valid (no collisions)
     */
    updateGhost: (position: Vector2 | null, rotation?: number, valid?: boolean) => void;

    /**
     * Set the current snap target for visual feedback.
     * 
     * @param snap - Snap result object or null
     */
    setSnapTarget: (snap: SnapResult | null) => void;

    /**
     * End the current drag operation.
     * Clears all drag-related state.
     */
    endDrag: () => void;

    /**
     * Rotate the floating ghost part 15 degrees clockwise.
     */
    rotateGhostCW: () => void;

    /**
     * Rotate the floating ghost part 15 degrees counter-clockwise.
     */
    rotateGhostCCW: () => void;

    // Wire creation actions

    /**
     * Set the source for a new wire connection.
     * 
     * @param source - Object containing type and ID of the source component
     */
    setWireSource: (source: { type: 'sensor' | 'signal'; id: SensorId | SignalId } | null) => void;

    /**
     * Clear the current wire source, cancelling the operation.
     */
    clearWireSource: () => void;

    // Connect mode actions

    /**
     * Set the source node for track connection mode.
     * 
     * @param source - Source node and edge information
     */
    setConnectSource: (source: { nodeId: NodeId; edgeId: EdgeId } | null) => void;

    /**
     * Clear the connect source, cancelling track connection mode.
     */
    clearConnectSource: () => void;

    // Transient updates (high frequency, no re-render)

    /**
     * Update the transient ghost state reference.
     * Does not trigger React re-renders. Use for high-frequency loop updates.
     */
    setGhostTransient: (ghost: GhostState | null) => void;

    /**
     * Get the current transient ghost state.
     */
    getGhostTransient: () => GhostState | null;
}

const initialState: EditorState = {
    selectedEdgeId: null,
    selectedPartId: 'kato-20-000',
    selectedSystem: 'n-scale',
    showGrid: true,
    showMeasurements: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
    draggedPartId: null,
    ghostPosition: null,
    ghostRotation: 0,
    userRotation: 0,
    ghostValid: true,
    snapTarget: null,
    wireSource: null,
    connectSource: null,
};

export const useEditorStore = create<EditorState & EditorActions>()(
    immer((set) => ({
        ...initialState,

        // Selection actions
        setSelectedEdge: (edgeId) => set((state) => {
            state.selectedEdgeId = edgeId;
        }),
        setSelectedPart: (partId) => set((state) => {
            state.selectedPartId = partId;
        }),
        setSelectedSystem: (system) => set((state) => {
            state.selectedSystem = system;
        }),

        // Viewport actions
        toggleGrid: () => set((state) => {
            state.showGrid = !state.showGrid;
        }),
        toggleMeasurements: () => set((state) => {
            state.showMeasurements = !state.showMeasurements;
        }),
        setZoom: (zoom) => set((state) => {
            state.zoom = Math.max(0.1, Math.min(5, zoom));
        }),
        setPan: (x, y) => set((state) => {
            state.pan.x = x;
            state.pan.y = y;
        }),
        resetView: () => set((state) => {
            state.zoom = 1;
            state.pan = { x: 0, y: 0 };
        }),

        // Drag actions
        startDrag: (partId) => set((state) => {
            state.draggedPartId = partId;
            state.ghostPosition = null;
            state.ghostRotation = 0;
            state.userRotation = 0;
            state.ghostValid = true;
            state.snapTarget = null;
        }),

        updateGhost: (position, rotation = 0, valid = true) => set((state) => {
            state.ghostPosition = position;
            state.ghostRotation = rotation;
            state.ghostValid = valid;
        }),

        setSnapTarget: (snap) => set((state) => {
            state.snapTarget = snap;
        }),

        endDrag: () => set((state) => {
            state.draggedPartId = null;
            state.ghostPosition = null;
            state.ghostRotation = 0;
            state.userRotation = 0;
            state.ghostValid = true;
            state.snapTarget = null;
        }),

        rotateGhostCW: () => set((state) => {
            const newRotation = (state.userRotation + 15) % 360;
            state.userRotation = newRotation;
            state.ghostRotation = newRotation;
        }),

        rotateGhostCCW: () => set((state) => {
            const newRotation = (state.userRotation - 15 + 360) % 360;
            state.userRotation = newRotation;
            state.ghostRotation = newRotation;
        }),

        // Wire creation actions
        setWireSource: (source) => set((state) => {
            state.wireSource = source;
        }),
        clearWireSource: () => set((state) => {
            state.wireSource = null;
        }),

        // Connect mode actions
        setConnectSource: (source) => set((state) => {
            state.connectSource = source;
        }),
        clearConnectSource: () => set((state) => {
            state.connectSource = null;
        }),

        // Transient updates
        setGhostTransient: (ghost) => {
            ghostRef.current = ghost;
        },
        getGhostTransient: () => ghostRef.current,
    }))
);

// Named Selectors
export const selectSelectedEdgeId = (state: EditorState) => state.selectedEdgeId;
export const selectSelectedPartId = (state: EditorState) => state.selectedPartId;
export const selectSelectedSystem = (state: EditorState) => state.selectedSystem;
export const selectShowGrid = (state: EditorState) => state.showGrid;
export const selectShowMeasurements = (state: EditorState) => state.showMeasurements;
export const selectZoom = (state: EditorState) => state.zoom;
export const selectPan = (state: EditorState) => state.pan;
export const selectDraggedPartId = (state: EditorState) => state.draggedPartId;
export const selectGhostPosition = (state: EditorState) => state.ghostPosition;
export const selectGhostRotation = (state: EditorState) => state.ghostRotation;
export const selectGhostValid = (state: EditorState) => state.ghostValid;
export const selectSnapTarget = (state: EditorState) => state.snapTarget;
export const selectWireSource = (state: EditorState) => state.wireSource;
export const selectConnectSource = (state: EditorState) => state.connectSource;
