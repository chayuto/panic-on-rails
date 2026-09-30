// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameLoop, browserEffectsSink } from '../useGameLoop';
import type { SimWorld } from '../../simulation/step';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useModeStore } from '../../stores/useModeStore';
import { useLogicStore } from '../../stores/useLogicStore';
import { useEffectsStore } from '../../stores/useEffectsStore';
import { TIMING } from '../../config/timing';
import type { Train } from '../../types';

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
    playNearMissSound: vi.fn(),
}));
import { playNearMissSound } from '../../utils/audioManager';

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
        vi.mocked(calculateTrainMovement).mockImplementation((t: unknown, dt: number) => {
            const train = t as Train;
            if (dt === 0) return null;
            return {
                trainId: train.id,
                distance: 100,
                edgeId: 'e1',
                direction: 1,
                bounced: false,
                held: false,
            };
        });

        renderHook(() => useGameLoop());

        // Simulate frame callback
        const loop = vi.mocked(window.requestAnimationFrame).mock.calls[0][0] as FrameRequestCallback;

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

        // Mock collision: one event per train crashing
        vi.mocked(checkCollisions).mockReturnValue([t1, t2].map((trainId, i) => ({
            type: 'collision' as const,
            trainId,
            otherTrainIds: [[t1, t2][1 - i]],
            location: { x: 0, y: 0 },
            debris: [],
            severity: 1,
        })));

        renderHook(() => useGameLoop());
        const loop = vi.mocked(window.requestAnimationFrame).mock.calls[0][0] as FrameRequestCallback;

        act(() => {
            loop(1000);
            loop(1016);
        });

        const s = useSimulationStore.getState();
        expect(s.trains[t1].crashed).toBe(true);
        expect(s.trains[t2].crashed).toBe(true);
    });

    it('runs in slow motion for a moment after a crash', () => {
        vi.mocked(checkCollisions).mockReturnValue([]);
        // Earlier tests' crashes started slow motion of their own
        useEffectsStore.getState().clearAllEffects();
        useModeStore.getState().enterSimulateMode();
        useSimulationStore.getState().setRunning(true);
        renderHook(() => useGameLoop());
        const loop = vi.mocked(window.requestAnimationFrame).mock.calls[0][0] as FrameRequestCallback;
        const elapsed = () => useSimulationStore.getState().simElapsed;

        // A normal frame of 50 ms advances the railway 50 ms
        act(() => loop(1000));
        let before = elapsed();
        act(() => loop(1050));
        expect(elapsed() - before).toBeCloseTo(0.05, 6);

        // Just after a crash, the same frame advances it less
        useEffectsStore.setState({ slowMotionUntil: 5000 });
        before = elapsed();
        act(() => loop(1100));
        expect(elapsed() - before).toBeCloseTo(0.05 * TIMING.CRASH_SLOW_MOTION_SCALE, 6);
        useEffectsStore.getState().clearAllEffects();
    });
});

describe('browserEffectsSink', () => {
    const world = {} as SimWorld;
    beforeEach(() => useEffectsStore.getState().clearAllEffects());

    it('a near miss plays its sting and flashes yellow where it happened', () => {
        browserEffectsSink({ type: 'near-miss', trainIds: ['a', 'b'], location: { x: 5, y: 6 } }, world);
        expect(playNearMissSound).toHaveBeenCalled();
        expect(useEffectsStore.getState().flashes).toEqual([expect.objectContaining({ position: { x: 5, y: 6 }, color: '#FFD93D' })]);
    });

    it('a crash or a derailment plays out in slow motion', () => {
        browserEffectsSink({ type: 'collision', trainId: 'a', otherTrainIds: ['b'], edgeId: 'e', location: { x: 0, y: 0 }, severity: 1 }, world);
        expect(useEffectsStore.getState().slowMotionUntil).toBeGreaterThan(performance.now());
        useEffectsStore.getState().clearAllEffects();
        browserEffectsSink({ type: 'derail', trainId: 'a', edgeId: 'e', location: { x: 0, y: 0 }, speed: 300 }, world);
        expect(useEffectsStore.getState().slowMotionUntil).toBeGreaterThan(performance.now());
    });
});
