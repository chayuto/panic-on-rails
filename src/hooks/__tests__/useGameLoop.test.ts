// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameLoop } from '../useGameLoop';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useModeStore } from '../../stores/useModeStore';
import { useLogicStore } from '../../stores/useLogicStore';

// Mock subsystems
vi.mock('../../simulation/movement', () => ({
    calculateTrainMovement: vi.fn(),
}));
import { calculateTrainMovement } from '../../simulation/movement';

vi.mock('../../simulation/collision', () => ({
    checkCollisions: vi.fn(() => []),
}));
import { checkCollisions } from '../../simulation/collision';

// Mock audio
vi.mock('../../utils/audioManager', () => ({
    playSound: vi.fn(),
    playSwitchSound: vi.fn(),
}));

describe('useGameLoop', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useSimulationStore.getState().clearTrains();
        useSimulationStore.getState().setRunning(false);
        useModeStore.getState().enterEditMode();
        useLogicStore.getState().clearLogic();

        // Mock RAF
        vi.stubGlobal('requestAnimationFrame', vi.fn());
        vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should not start loop if not simulating', () => {
        useModeStore.getState().enterEditMode();
        renderHook(() => useGameLoop());
        expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('should not start loop if simulating but paused', () => {
        useModeStore.getState().enterSimulateMode();
        useSimulationStore.getState().setRunning(false);

        renderHook(() => useGameLoop());
        expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('should start loop if simulating and running', () => {
        useModeStore.getState().enterSimulateMode();
        useSimulationStore.getState().setRunning(true);

        renderHook(() => useGameLoop());
        expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should update trains on frame', () => {
        useModeStore.getState().enterSimulateMode();
        useSimulationStore.getState().setRunning(true);

        // Spawn a train in store
        const { spawnTrain } = useSimulationStore.getState();
        const trainId = spawnTrain('e1');

        // Setup mock movement - return null if dt is 0
        (calculateTrainMovement as any).mockImplementation((t: any, dt: number) => {
            if (dt === 0) return null;
            return {
                trainId: t.id,
                distance: 100,
                edgeId: 'e1',
                direction: 1,
            };
        });

        renderHook(() => useGameLoop());

        // Simulate frame callback
        const loop = (window.requestAnimationFrame as any).mock.calls[0][0];

        act(() => {
            // First call initializes time (delta = 0)
            loop(1000);
        });

        // Check update NOT called yet (distance should be 0)
        const trainBefore = useSimulationStore.getState().trains[trainId];
        expect(trainBefore.distanceAlongEdge).toBe(0);

        act(() => {
            // Second call (delta = 16ms)
            loop(1016);
        });

        const trainAfter = useSimulationStore.getState().trains[trainId];
        // Expect distance to be updated to 100
        expect(trainAfter.distanceAlongEdge).toBe(100);
    });

    it('should handle collisions', () => {
        useModeStore.getState().enterSimulateMode();
        useSimulationStore.getState().setRunning(true);
        const { spawnTrain } = useSimulationStore.getState();
        const t1 = spawnTrain('e1');
        const t2 = spawnTrain('e1');

        // Mock collision
        (checkCollisions as any).mockReturnValue([{
            trainIds: [t1, t2],
            location: { x: 0, y: 0 },
            debris: [],
            severity: 1
        }]);

        renderHook(() => useGameLoop());
        const loop = (window.requestAnimationFrame as any).mock.calls[0][0];

        act(() => {
            loop(1000);
            loop(1016);
        });

        const s = useSimulationStore.getState();
        expect(s.trains[t1].crashed).toBe(true);
        expect(s.trains[t2].crashed).toBe(true);
    });
});
