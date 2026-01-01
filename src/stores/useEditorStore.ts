import { create } from 'zustand';
import type { EdgeId, PartId, EditorMode } from '../types';

interface EditorState {
    mode: EditorMode;
    selectedEdgeId: EdgeId | null;
    selectedPartId: PartId;
    showGrid: boolean;
    zoom: number;
    pan: { x: number; y: number };
}

interface EditorActions {
    setMode: (mode: EditorMode) => void;
    setSelectedEdge: (edgeId: EdgeId | null) => void;
    setSelectedPart: (partId: PartId) => void;
    toggleGrid: () => void;
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
    resetView: () => void;
}

const initialState: EditorState = {
    mode: 'edit',
    selectedEdgeId: null,
    selectedPartId: 'kato-20-000', // Default to standard straight
    showGrid: true,
    zoom: 1,
    pan: { x: 0, y: 0 },
};

export const useEditorStore = create<EditorState & EditorActions>()((set) => ({
    ...initialState,

    setMode: (mode) => set({ mode }),
    setSelectedEdge: (edgeId) => set({ selectedEdgeId: edgeId }),
    setSelectedPart: (partId) => set({ selectedPartId: partId }),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
    setPan: (x, y) => set({ pan: { x, y } }),
    resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
}));
