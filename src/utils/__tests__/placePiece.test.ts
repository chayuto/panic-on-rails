import { describe, it, expect, beforeEach } from 'vitest';
import { layPart } from '../placePiece';
import { isOpenEnd } from '../graphAnalysis';
import { normalizeAngle } from '../geometry';
import { resetWorld } from '../../simulation/harness';
import { useTrackStore } from '../../stores/useTrackStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useEditorStore } from '../../stores/useEditorStore';

const openEnds = () => Object.values(useTrackStore.getState().nodes).filter(isOpenEnd);

describe('laying track from the keyboard', () => {
    beforeEach(() => {
        resetWorld();
        useCollectionStore.getState().setMode('free');
        useEditorStore.getState().resetView();
    });

    it('lays the first piece in the middle of the view', () => {
        expect(layPart('kato-20-000')).not.toBeNull();
        expect(Object.keys(useTrackStore.getState().edges)).toHaveLength(1);
    });

    it('carries on from the piece laid last: straights make one joined line', () => {
        for (let i = 0; i < 3; i++) layPart('kato-20-000');
        expect(Object.keys(useTrackStore.getState().edges)).toHaveLength(3);
        // Joined end to end: only the line's two ends are open
        expect(openEnds()).toHaveLength(2);
    });

    it('turns a curve the way it is laid: left or right', () => {
        const turned = (side: 'left' | 'right') => {
            resetWorld();
            layPart('kato-20-000');
            const before = new Set(openEnds().map(n => n.id));
            const edgeId = layPart('kato-20-120', side)!;
            const { startNodeId, endNodeId } = useTrackStore.getState().edges[edgeId];
            // The curve's new open end, and the open end it was laid on (now joined)
            const nodes = useTrackStore.getState().nodes;
            const fresh = [startNodeId, endNodeId].map(id => nodes[id]).find(n => n && isOpenEnd(n) && !before.has(n.id))!;
            const joined = [...before].find(id => !nodes[id] || !isOpenEnd(nodes[id]));
            expect(joined).toBeDefined();
            return fresh;
        };
        const left = turned('left');
        const right = turned('right');
        // An R315 45° curve: the two new ends face 90° apart, mirror images of each other
        expect(normalizeAngle(right.rotation - left.rotation)).toBeCloseTo(90, 3);
    });

    it('in collection mode lays only the pieces still in the box', () => {
        useCollectionStore.getState().resetCollection(); // the M1 box: four S248
        for (let i = 0; i < 5; i++) layPart('kato-20-000');
        expect(Object.keys(useTrackStore.getState().edges)).toHaveLength(4);
    });
});
