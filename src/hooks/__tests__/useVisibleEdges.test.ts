// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisibleEdges, useVisibleNodes } from '../useVisibleEdges';
import { useTrackStore } from '../../stores/useTrackStore';
import { resetWorld, loadSetPlan } from '../../simulation/harness';

/** Everything the M1 oval covers, and more. */
const VIEW = { x: -2000, y: -2000, width: 6000, height: 6000 };

describe('useVisibleEdges', () => {
    beforeEach(() => resetWorld());

    it('follows a new layout of as many pieces, though the view never moved', () => {
        loadSetPlan('kato-20-852'); // M1
        const edges = renderHook(() => useVisibleEdges(VIEW));
        const nodes = renderHook(() => useVisibleNodes(VIEW));
        expect(edges.result.current.sort()).toEqual(Object.keys(useTrackStore.getState().edges).sort());

        // A starter set: the same sixteen pieces, laid again under new ids
        act(() => {
            resetWorld();
            loadSetPlan('kato-106-0018');
        });
        const { edges: now, nodes: nodesNow } = useTrackStore.getState();
        expect(edges.result.current.sort()).toEqual(Object.keys(now).sort());
        expect(nodes.result.current.sort()).toEqual(Object.keys(nodesNow).sort());
    });
});
