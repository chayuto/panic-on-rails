/**
 * Unit Tests for Effects Store
 * 
 * Tests visual effects state management:
 * - Ripple effects (add, auto-cleanup)
 * - Flash effects (add, auto-cleanup)
 * - Screen shake (trigger, decay, offset calculation)
 * - Hover state tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useEffectsStore } from '../useEffectsStore';

describe('useEffectsStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useEffectsStore.getState().clearAllEffects();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('triggerRipple', () => {
        it('adds a ripple to state', () => {
            const { triggerRipple } = useEffectsStore.getState();

            triggerRipple({ x: 100, y: 200 });

            const { ripples } = useEffectsStore.getState();
            expect(ripples).toHaveLength(1);
            expect(ripples[0].position).toEqual({ x: 100, y: 200 });
        });

        it('assigns default values to ripple', () => {
            const { triggerRipple } = useEffectsStore.getState();

            triggerRipple({ x: 0, y: 0 });

            const { ripples } = useEffectsStore.getState();
            expect(ripples[0].duration).toBe(400); // default
            expect(ripples[0].color).toBe('#00FF88'); // default
            expect(ripples[0].startRadius).toBe(8); // default
            expect(ripples[0].endRadius).toBe(40); // default
        });

        it('allows custom options', () => {
            const { triggerRipple } = useEffectsStore.getState();

            triggerRipple({ x: 0, y: 0 }, {
                color: '#FF0000',
                duration: 1000,
                endRadius: 100,
            });

            const { ripples } = useEffectsStore.getState();
            expect(ripples[0].color).toBe('#FF0000');
            expect(ripples[0].duration).toBe(1000);
            expect(ripples[0].endRadius).toBe(100);
        });

        it('auto-removes ripple after duration', () => {
            const { triggerRipple } = useEffectsStore.getState();

            triggerRipple({ x: 0, y: 0 }, { duration: 500 });
            expect(useEffectsStore.getState().ripples).toHaveLength(1);

            // Advance past duration + cleanup buffer
            vi.advanceTimersByTime(600);

            expect(useEffectsStore.getState().ripples).toHaveLength(0);
        });

        it('generates unique IDs for multiple ripples', () => {
            const { triggerRipple } = useEffectsStore.getState();

            triggerRipple({ x: 0, y: 0 });
            triggerRipple({ x: 100, y: 100 });

            const { ripples } = useEffectsStore.getState();
            expect(ripples[0].id).not.toBe(ripples[1].id);
        });
    });

    describe('triggerFlash', () => {
        it('adds a flash to state', () => {
            const { triggerFlash } = useEffectsStore.getState();

            triggerFlash({ x: 50, y: 75 });

            const { flashes } = useEffectsStore.getState();
            expect(flashes).toHaveLength(1);
            expect(flashes[0].position).toEqual({ x: 50, y: 75 });
        });

        it('assigns default values to flash', () => {
            const { triggerFlash } = useEffectsStore.getState();

            triggerFlash({ x: 0, y: 0 });

            const { flashes } = useEffectsStore.getState();
            expect(flashes[0].duration).toBe(150); // default
            expect(flashes[0].color).toBe('#FFFFFF'); // default
            expect(flashes[0].radius).toBe(25); // default
        });

        it('auto-removes flash after duration', () => {
            const { triggerFlash } = useEffectsStore.getState();

            triggerFlash({ x: 0, y: 0 }, { duration: 200 });
            expect(useEffectsStore.getState().flashes).toHaveLength(1);

            vi.advanceTimersByTime(300);

            expect(useEffectsStore.getState().flashes).toHaveLength(0);
        });
    });

    describe('setHoveredSwitch', () => {
        it('sets hovered switch ID', () => {
            const { setHoveredSwitch } = useEffectsStore.getState();

            setHoveredSwitch('switch-123');

            const { hoveredSwitchId } = useEffectsStore.getState();
            expect(hoveredSwitchId).toBe('switch-123');
        });

        it('sets hovered switch position', () => {
            const { setHoveredSwitch } = useEffectsStore.getState();

            setHoveredSwitch('switch-123', { x: 200, y: 300 });

            const { hoveredSwitchPosition } = useEffectsStore.getState();
            expect(hoveredSwitchPosition).toEqual({ x: 200, y: 300 });
        });

        it('clears hover state with null', () => {
            const { setHoveredSwitch } = useEffectsStore.getState();

            setHoveredSwitch('switch-123', { x: 100, y: 100 });
            setHoveredSwitch(null);

            const state = useEffectsStore.getState();
            expect(state.hoveredSwitchId).toBeNull();
            expect(state.hoveredSwitchPosition).toBeNull();
        });
    });

    describe('triggerScreenShake', () => {
        it('sets screen shake with intensity and endTime', () => {
            const { triggerScreenShake } = useEffectsStore.getState();
            const now = Date.now();

            triggerScreenShake(10, 500);

            const { screenShake } = useEffectsStore.getState();
            expect(screenShake).not.toBeNull();
            expect(screenShake!.intensity).toBe(10);
            expect(screenShake!.endTime).toBeGreaterThanOrEqual(now + 500);
            expect(screenShake!.decay).toBe(true); // default
        });

        it('allows disabling decay', () => {
            const { triggerScreenShake } = useEffectsStore.getState();

            triggerScreenShake(5, 300, false);

            const { screenShake } = useEffectsStore.getState();
            expect(screenShake!.decay).toBe(false);
        });
    });

    describe('getScreenShakeOffset', () => {
        it('returns zero offset when no shake active', () => {
            const { getScreenShakeOffset } = useEffectsStore.getState();

            const offset = getScreenShakeOffset();

            expect(offset).toEqual({ x: 0, y: 0 });
        });

        it('returns non-zero offset during active shake', () => {
            const { triggerScreenShake, getScreenShakeOffset } = useEffectsStore.getState();

            triggerScreenShake(20, 1000);

            // Get multiple samples to verify randomness
            const offsets = [];
            for (let i = 0; i < 5; i++) {
                offsets.push(getScreenShakeOffset());
            }

            // At least some should be non-zero
            const hasNonZero = offsets.some(o => o.x !== 0 || o.y !== 0);
            expect(hasNonZero).toBe(true);
        });

        it('returns offset within intensity bounds', () => {
            const { triggerScreenShake, getScreenShakeOffset } = useEffectsStore.getState();
            const intensity = 10;

            triggerScreenShake(intensity, 1000);

            for (let i = 0; i < 10; i++) {
                const offset = getScreenShakeOffset();
                expect(Math.abs(offset.x)).toBeLessThanOrEqual(intensity);
                expect(Math.abs(offset.y)).toBeLessThanOrEqual(intensity);
            }
        });

        it('returns zero after shake expires', () => {
            const { triggerScreenShake, getScreenShakeOffset } = useEffectsStore.getState();

            triggerScreenShake(10, 100);
            vi.advanceTimersByTime(150);

            const offset = getScreenShakeOffset();
            expect(offset).toEqual({ x: 0, y: 0 });
        });
    });

    describe('cleanupExpiredEffects', () => {
        it('removes expired ripples and flashes', () => {
            const store = useEffectsStore.getState();

            store.triggerRipple({ x: 0, y: 0 }, { duration: 100 });
            store.triggerFlash({ x: 0, y: 0 }, { duration: 100 });

            vi.advanceTimersByTime(150);
            store.cleanupExpiredEffects();

            const state = useEffectsStore.getState();
            expect(state.ripples).toHaveLength(0);
            expect(state.flashes).toHaveLength(0);
        });
    });

    describe('clearAllEffects', () => {
        it('resets all state to initial values', () => {
            const store = useEffectsStore.getState();

            store.triggerRipple({ x: 0, y: 0 });
            store.triggerFlash({ x: 0, y: 0 });
            store.setHoveredSwitch('switch-1', { x: 100, y: 100 });
            store.triggerScreenShake(10, 500);

            store.clearAllEffects();

            const state = useEffectsStore.getState();
            expect(state.ripples).toHaveLength(0);
            expect(state.flashes).toHaveLength(0);
            expect(state.hoveredSwitchId).toBeNull();
            expect(state.hoveredSwitchPosition).toBeNull();
            expect(state.screenShake).toBeNull();
        });
    });
});
