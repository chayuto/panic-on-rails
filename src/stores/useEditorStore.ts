import { create } from 'zustand';
import type { EdgeId, PartId, Vector2, NodeId, SensorId, SignalId } from '../types';

// Snap result when near an open endpoint
export interface SnapResult {
    targetNodeId: NodeId;
    targetPosition: Vector2;
    targetRotation: number; // degrees
    distance: number;
}

interface EditorState {
    // Selection state
    selectedEdgeId: EdgeId | null;
    selectedPartId: PartId;
    selectedSystem: 'n-scale' | 'wooden';

    // Viewport
    showGrid: boolean;
    zoom: number;
    pan: { x: number; y: number };

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
}

interface EditorActions {
    // Selection actions
    setSelectedEdge: (edgeId: EdgeId | null) => void;
    setSelectedPart: (partId: PartId) => void;
    setSelectedSystem: (system: 'n-scale' | 'wooden') => void;

    // Viewport actions
    toggleGrid: () => void;
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
    resetView: () => void;

    // Drag actions
    startDrag: (partId: PartId) => void;
    updateGhost: (position: Vector2 | null, rotation?: number, valid?: boolean) => void;
    setSnapTarget: (snap: SnapResult | null) => void;
    endDrag: () => void;
    rotateGhostCW: () => void;
    rotateGhostCCW: () => void;

    // Wire creation actions
    setWireSource: (source: { type: 'sensor' | 'signal'; id: SensorId | SignalId } | null) => void;
    clearWireSource: () => void;
}

const initialState: EditorState = {
    selectedEdgeId: null,
    selectedPartId: 'kato-20-000',
    selectedSystem: 'n-scale',
    showGrid: true,
    zoom: 1,
    pan: { x: 0, y: 0 },
    draggedPartId: null,
    ghostPosition: null,
    ghostRotation: 0,
    userRotation: 0,
    ghostValid: true,
    snapTarget: null,
    wireSource: null,
};

export const useEditorStore = create<EditorState & EditorActions>()((set) => ({
    ...initialState,

    // Selection actions
    setSelectedEdge: (edgeId) => set({ selectedEdgeId: edgeId }),
    setSelectedPart: (partId) => set({ selectedPartId: partId }),
    setSelectedSystem: (system) => set({ selectedSystem: system }),

    // Viewport actions
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
    setPan: (x, y) => set({ pan: { x, y } }),
    resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),

    // Drag actions
    startDrag: (partId) => set({
        draggedPartId: partId,
        ghostPosition: null,
        ghostRotation: 0,
        userRotation: 0,
        ghostValid: true,
        snapTarget: null,
    }),

    updateGhost: (position, rotation = 0, valid = true) => set({
        ghostPosition: position,
        ghostRotation: rotation,
        ghostValid: valid,
    }),

    setSnapTarget: (snap) => set({ snapTarget: snap }),

    endDrag: () => set({
        draggedPartId: null,
        ghostPosition: null,
        ghostRotation: 0,
        userRotation: 0,
        ghostValid: true,
        snapTarget: null,
    }),

    rotateGhostCW: () => set((state) => {
        const newRotation = (state.userRotation + 15) % 360;
        return {
            userRotation: newRotation,
            ghostRotation: newRotation, // Update visual rotation too (will be overridden if snapped)
        };
    }),

    rotateGhostCCW: () => set((state) => {
        const newRotation = (state.userRotation - 15 + 360) % 360;
        return {
            userRotation: newRotation,
            ghostRotation: newRotation,
        };
    }),

    // Wire creation actions
    setWireSource: (source) => set({ wireSource: source }),
    clearWireSource: () => set({ wireSource: null }),
}));
