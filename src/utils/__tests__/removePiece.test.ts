import { describe, it, expect, beforeEach } from 'vitest';
import { removePiece } from '../removePiece';
import { resetWorld, loadSetPlan } from '../../simulation/harness';
import { useTrackStore } from '../../stores/useTrackStore';
import { useLogicStore } from '../../stores/useLogicStore';

describe('removePiece', () => {
    beforeEach(() => resetWorld());

    it('takes the sensors, platforms and signals on a piece, and the wires to them', () => {
        const edgeId = useTrackStore.getState().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        const { startNodeId } = useTrackStore.getState().edges[edgeId];
        const logic = useLogicStore.getState();
        const sensor = logic.addSensor(edgeId, 60);
        logic.addStation(edgeId, 124, 200);
        const signal = logic.addSignal(startNodeId);
        logic.addWire('sensor', sensor, 'signal', signal, 'toggle');

        removePiece(edgeId);

        expect(useTrackStore.getState().edges).toEqual({});
        expect(useLogicStore.getState()).toMatchObject({ sensors: {}, stations: {}, signals: {}, wires: {} });
    });

    it('keeps a signal at a joint the next piece still uses', () => {
        loadSetPlan('kato-20-852');
        const straight = Object.values(useTrackStore.getState().edges).find(e => e.partId === 'kato-20-000')!;
        const signal = useLogicStore.getState().addSignal(straight.startNodeId);

        removePiece(straight.id);

        expect(useTrackStore.getState().edges[straight.id]).toBeUndefined();
        expect(useLogicStore.getState().signals[signal]).toBeDefined();
    });

    it('takes the whole of a turnout, and what stands on either of its routes', () => {
        useTrackStore.getState().addTrack('kato-20-202', { x: 0, y: 0 }, 0);
        const routes = Object.values(useTrackStore.getState().edges);
        expect(routes).toHaveLength(2);
        for (const route of routes) useLogicStore.getState().addSensor(route.id, 40);

        removePiece(routes[1].id);

        expect(useTrackStore.getState().edges).toEqual({});
        expect(useLogicStore.getState().sensors).toEqual({});
    });

    it('is where the cascade lives: the track store on its own removes only track', () => {
        const edgeId = useTrackStore.getState().addTrack('kato-20-000', { x: 0, y: 0 }, 0)!;
        useLogicStore.getState().addStation(edgeId, 124, 200);

        useTrackStore.getState().removeTrack(edgeId);

        expect(Object.keys(useLogicStore.getState().stations)).toHaveLength(1);
    });
});
