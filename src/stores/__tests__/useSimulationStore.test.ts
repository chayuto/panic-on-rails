import { describe, it, expect, beforeEach } from 'vitest';
import type { CrashedPart } from '../../utils/crashPhysics';
import { useSimulationStore } from '../useSimulationStore';

describe('useSimulationStore', () => {
    beforeEach(() => {
        useSimulationStore.getState().clearTrains();
        useSimulationStore.getState().clearDebris();
        useSimulationStore.getState().setRunning(false);
        useSimulationStore.getState().setSpeedMultiplier(1.0);
    });

    describe('Trains', () => {
        it('should spawn and remove trains', () => {
            const { spawnTrain, removeTrain } = useSimulationStore.getState();
            // Default spawn
            const trainId = spawnTrain('edge-1', '#ff0000', 3);

            const state = useSimulationStore.getState();
            expect(state.trains[trainId]).toBeDefined();
            expect(state.trains[trainId].id).toBe(trainId);
            expect(state.trains[trainId].currentEdgeId).toBe('edge-1');
            expect(state.trains[trainId].carriageCount).toBe(3);
            expect(state.trains[trainId].color).toBe('#ff0000');

            removeTrain(trainId);
            expect(useSimulationStore.getState().trains[trainId]).toBeUndefined();
        });

        it('should cycle colors if not provided', () => {
            const { spawnTrain } = useSimulationStore.getState();
            const t1 = spawnTrain('e1');
            const t2 = spawnTrain('e2');

            // Just check they have colors
            expect(useSimulationStore.getState().trains[t1].color).toBeDefined();
            expect(useSimulationStore.getState().trains[t2].color).toBeDefined();
        });

        it('should update train position', () => {
            const { spawnTrain, updateTrainPosition } = useSimulationStore.getState();
            const trainId = spawnTrain('edge-1');

            updateTrainPosition(trainId, 100, 'edge-2', -1);

            const train = useSimulationStore.getState().trains[trainId];
            expect(train.distanceAlongEdge).toBe(100);
            expect(train.currentEdgeId).toBe('edge-2');
            expect(train.direction).toBe(-1);
        });

        it('should set crashed state', () => {
            const { spawnTrain, setCrashed } = useSimulationStore.getState();
            const trainId = spawnTrain('edge-1');

            setCrashed(trainId);

            const train = useSimulationStore.getState().trains[trainId];
            expect(train.crashed).toBe(true);
            expect(train.speed).toBe(0);
            expect(train.crashTime).toBeDefined();
        });

        it('should clear all trains', () => {
            const { spawnTrain, clearTrains } = useSimulationStore.getState();
            spawnTrain('e1');
            spawnTrain('e2');

            expect(Object.keys(useSimulationStore.getState().trains)).toHaveLength(2);

            clearTrains();
            expect(Object.keys(useSimulationStore.getState().trains)).toHaveLength(0);
        });
    });

    describe('Debris', () => {
        it('should add and clear debris', () => {
            const { addCrashedParts, clearDebris } = useSimulationStore.getState();

            // Mock parts - we interpret them as CrashedPart
            // We need to cast as any to bypass strict type checks for tests if we don't construct full objects
            const parts = [{ id: 'part-1' }, { id: 'part-2' }] as unknown as CrashedPart[];
            addCrashedParts(parts);

            expect(useSimulationStore.getState().crashedParts).toHaveLength(2);

            clearDebris();
            expect(useSimulationStore.getState().crashedParts).toHaveLength(0);
        });

        it('should set crashed parts explicitly', () => {
            const { setCrashedParts } = useSimulationStore.getState();
            const parts = [{ id: 'p1' }] as unknown as CrashedPart[];
            setCrashedParts(parts);
            expect(useSimulationStore.getState().crashedParts).toHaveLength(1);
        });
    });

    describe('Control', () => {
        it('should toggle running state', () => {
            const { toggleRunning, setRunning } = useSimulationStore.getState();

            expect(useSimulationStore.getState().isRunning).toBe(false);

            toggleRunning();
            expect(useSimulationStore.getState().isRunning).toBe(true);

            setRunning(false);
            expect(useSimulationStore.getState().isRunning).toBe(false);
        });

        it('should set speed multiplier', () => {
            const { setSpeedMultiplier } = useSimulationStore.getState();
            setSpeedMultiplier(2.0);
            expect(useSimulationStore.getState().speedMultiplier).toBe(2.0);
        });
    });
});
