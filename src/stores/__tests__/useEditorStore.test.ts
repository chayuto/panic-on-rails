import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../useEditorStore';

describe('useEditorStore', () => {
    beforeEach(() => {
        const { resetView, endDrag, clearWireSource, clearConnectSource, setGhostTransient, setSelectedEdge, setSelectedPart } = useEditorStore.getState();
        resetView();
        endDrag();
        clearWireSource();
        clearConnectSource();
        setGhostTransient(null);
        setSelectedEdge(null);
        setSelectedPart('kato-20-000');
    });

    describe('Selection', () => {
        it('should select and deselect items', () => {
            const { setSelectedEdge, setSelectedPart, setSelectedSystem } = useEditorStore.getState();

            setSelectedEdge('edge-1');
            expect(useEditorStore.getState().selectedEdgeId).toBe('edge-1');

            setSelectedEdge(null);
            expect(useEditorStore.getState().selectedEdgeId).toBeNull();

            setSelectedPart('part-xyz');
            expect(useEditorStore.getState().selectedPartId).toBe('part-xyz');

            setSelectedSystem('wooden');
            expect(useEditorStore.getState().selectedSystem).toBe('wooden');
        });
    });

    describe('Viewport', () => {
        it('should zoom within limits', () => {
            const { setZoom } = useEditorStore.getState();

            setZoom(2);
            expect(useEditorStore.getState().zoom).toBe(2);

            setZoom(10); // Should clamp to 5
            expect(useEditorStore.getState().zoom).toBe(5);

            setZoom(0.01); // Should clamp to 0.1
            expect(useEditorStore.getState().zoom).toBe(0.1);
        });

        it('should pan and reset view', () => {
            const { setPan, resetView } = useEditorStore.getState();

            setPan(100, 200);
            expect(useEditorStore.getState().pan).toEqual({ x: 100, y: 200 });

            resetView();
            expect(useEditorStore.getState().pan).toEqual({ x: 0, y: 0 });
            expect(useEditorStore.getState().zoom).toBe(1);
        });
    });

    describe('Drag & Drop', () => {
        it('should manage drag state', () => {
            const { startDrag, updateGhost, endDrag } = useEditorStore.getState();

            startDrag('part-1');
            const s1 = useEditorStore.getState();
            expect(s1.draggedPartId).toBe('part-1');
            expect(s1.ghostValid).toBe(true);

            updateGhost({ x: 10, y: 10 }, 45, false);
            const s2 = useEditorStore.getState();
            expect(s2.ghostPosition).toEqual({ x: 10, y: 10 });
            expect(s2.ghostRotation).toBe(45);
            expect(s2.ghostValid).toBe(false);

            endDrag();
            const s3 = useEditorStore.getState();
            expect(s3.draggedPartId).toBeNull();
            expect(s3.ghostPosition).toBeNull();
        });

        it('should rotate ghost', () => {
            const { startDrag, rotateGhostCW, rotateGhostCCW } = useEditorStore.getState();
            startDrag('p1');

            rotateGhostCW(); // +15 -> 15
            expect(useEditorStore.getState().userRotation).toBe(15);

            rotateGhostCCW(); // 15 - 15 -> 0
            expect(useEditorStore.getState().userRotation).toBe(0);

            rotateGhostCCW(); // 0 - 15 + 360 -> 345
            expect(useEditorStore.getState().userRotation).toBe(345);
        });
    });

    describe('Transient State', () => {
        it('should set and get transient ghost state', () => {
            const { setGhostTransient, getGhostTransient } = useEditorStore.getState();

            const ghost = { position: { x: 1, y: 1 }, rotation: 90, valid: true };
            setGhostTransient(ghost);

            expect(getGhostTransient()).toEqual(ghost);

            setGhostTransient(null);
            expect(getGhostTransient()).toBeNull();
        });
    });
});
