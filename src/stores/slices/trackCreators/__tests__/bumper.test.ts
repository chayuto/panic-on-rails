/**
 * Buffer stops: a bumper track's far end is a dead end, not a connector.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerParts } from '../../../../data/catalog/registry';
import { getPartConnectors } from '../../../../data/catalog/helpers';
import type { PartDefinition } from '../../../../data/catalog/types';
import { useTrackStore } from '../../../useTrackStore';
import { findOpenEndpoints } from '../../../../utils/snapManager';
import { resetWorld, simHarness, summarize } from '../../../../simulation/harness';
import { useSimulationStore } from '../../../useSimulationStore';

const BUMPER: PartDefinition = {
    id: 'test-bumper-62',
    name: 'Test bumper 62mm',
    brand: 'generic',
    scale: 'n-scale',
    geometry: { type: 'straight', length: 62, bumper: true },
    cost: 100,
};

registerParts([BUMPER]);

describe('bumper track', () => {
    beforeEach(() => resetWorld());

    it('has a single connector: the buffer-stop end cannot be joined', () => {
        expect(getPartConnectors(BUMPER).nodes.map(n => n.localId)).toEqual(['A']);
    });

    it('marks the far node as a buffer stop that is never an open endpoint', () => {
        useTrackStore.getState().addTrack(BUMPER.id, { x: 100, y: 100 }, 0);
        const nodes = useTrackStore.getState().nodes;
        const stop = Object.values(nodes).find(n => n.bumper);
        expect(stop?.position).toEqual({ x: 162, y: 100 });
        const open = findOpenEndpoints(nodes).map(n => n.id);
        expect(open).toHaveLength(1);
        expect(open).not.toContain(stop!.id);
        expect(useTrackStore.getState().getOpenEndpoints().map(n => n.id)).toEqual(open);
    });

    it('turns a train back instead of letting it run off the end', () => {
        const edgeId = useTrackStore.getState().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const stopEdge = useTrackStore.getState().addTrack(BUMPER.id, { x: 248, y: 0 }, 0)!;
        const nodes = useTrackStore.getState().nodes;
        const joinA = Object.values(nodes).find(n => n.position.x === 248 && n.connections.includes(edgeId))!;
        const joinB = Object.values(nodes).find(n => n.position.x === 248 && n.connections.includes(stopEdge))!;
        useTrackStore.getState().connectNodes(joinA.id, joinB.id);

        useSimulationStore.getState().spawnTrain(edgeId, '#fff', 1, 200);
        const events = simHarness.runSeconds(3);
        expect(events.some(e => e.type === 'bounce')).toBe(true);
        expect(summarize().trains[0].crashed).toBe(false);
    });
});
