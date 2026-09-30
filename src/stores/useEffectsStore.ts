/**
 * Effects Store
 * 
 * Zustand store for managing visual effects state.
 * Handles ripples, flashes, and other transient effects.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Vector2 } from '../types';
import { prefersReducedMotion } from '../utils/motion';

/**
 * At most this many flashes start in any second, however many crashes
 * happen at once: WCAG 2.3.1 (three flashes or below).
 */
export const MAX_FLASHES_PER_SECOND = 3;
/** When recent flashes started (ms) */
let flashStarts: number[] = [];

// ===========================
// Types
// ===========================

export interface RippleEffect {
    id: string;
    position: Vector2;
    startTime: number;
    duration: number;
    color: string;
    startRadius: number;
    endRadius: number;
}

export interface FlashEffect {
    id: string;
    position: Vector2;
    startTime: number;
    duration: number;
    color: string;
    radius: number;
}

export interface HoverState {
    nodeId: string | null;
    position: Vector2 | null;
}

export interface ScreenShake {
    intensity: number;
    duration: number;
    endTime: number;
    decay: boolean;
}

interface EffectsState {
    // Active effects
    ripples: RippleEffect[];
    flashes: FlashEffect[];

    // Hover state for switches
    hoveredSwitchId: string | null;
    hoveredSwitchPosition: Vector2 | null;

    // Screen shake
    screenShake: ScreenShake | null;

    /** Until when (performance.now(), ms) the game loop runs in slow motion after a crash */
    slowMotionUntil: number;

    // Actions
    triggerRipple: (position: Vector2, options?: Partial<RippleEffect>) => void;
    triggerFlash: (position: Vector2, options?: Partial<FlashEffect>) => void;
    setHoveredSwitch: (nodeId: string | null, position?: Vector2 | null) => void;
    triggerScreenShake: (intensity: number, duration: number, decay?: boolean) => void;
    /** Slow the game loop down for `duration` ms from now */
    triggerSlowMotion: (duration: number) => void;
    getScreenShakeOffset: () => Vector2;
    cleanupExpiredEffects: () => void;
    clearAllEffects: () => void;
}

// ===========================
// Default Configuration
// ===========================

const DEFAULT_RIPPLE: Omit<RippleEffect, 'id' | 'position' | 'startTime'> = {
    duration: 400,
    color: '#00FF88',
    startRadius: 8,
    endRadius: 40,
};

const DEFAULT_FLASH: Omit<FlashEffect, 'id' | 'position' | 'startTime'> = {
    duration: 150,
    color: '#FFFFFF',
    radius: 25,
};

// ===========================
// Store
// ===========================

let effectIdCounter = 0;

function generateEffectId(): string {
    return `effect-${++effectIdCounter}`;
}

export const useEffectsStore = create<EffectsState>()(
    immer((set, get) => ({
        ripples: [],
        flashes: [],
        hoveredSwitchId: null,
        hoveredSwitchPosition: null,
        screenShake: null,
        slowMotionUntil: 0,

        triggerRipple: (position, options = {}) => {
            const ripple: RippleEffect = {
                id: generateEffectId(),
                position,
                startTime: Date.now(),
                duration: options.duration ?? DEFAULT_RIPPLE.duration,
                color: options.color ?? DEFAULT_RIPPLE.color,
                startRadius: options.startRadius ?? DEFAULT_RIPPLE.startRadius,
                endRadius: options.endRadius ?? DEFAULT_RIPPLE.endRadius,
            };

            set((state) => {
                state.ripples.push(ripple);
            });

            // Auto-cleanup after duration
            setTimeout(() => {
                set((state) => {
                    const index = state.ripples.findIndex(r => r.id === ripple.id);
                    if (index !== -1) {
                        state.ripples.splice(index, 1);
                    }
                });
            }, ripple.duration + 50);
        },

        triggerFlash: (position, options = {}) => {
            // A pile-up mustn't strobe
            const now = Date.now();
            flashStarts = flashStarts.filter(t => now - t < 1000);
            if (flashStarts.length >= MAX_FLASHES_PER_SECOND) return;
            flashStarts.push(now);

            const flash: FlashEffect = {
                id: generateEffectId(),
                position,
                startTime: now,
                duration: options.duration ?? DEFAULT_FLASH.duration,
                color: options.color ?? DEFAULT_FLASH.color,
                radius: options.radius ?? DEFAULT_FLASH.radius,
            };

            set((state) => {
                state.flashes.push(flash);
            });

            // Auto-cleanup after duration
            setTimeout(() => {
                set((state) => {
                    const index = state.flashes.findIndex(f => f.id === flash.id);
                    if (index !== -1) {
                        state.flashes.splice(index, 1);
                    }
                });
            }, flash.duration + 50);
        },

        setHoveredSwitch: (nodeId, position = null) => {
            set((state) => {
                state.hoveredSwitchId = nodeId;
                state.hoveredSwitchPosition = position;
            });
        },

        cleanupExpiredEffects: () => {
            const now = Date.now();
            set((state) => {
                state.ripples = state.ripples.filter(r => now - r.startTime < r.duration);
                state.flashes = state.flashes.filter(f => now - f.startTime < f.duration);
                if (state.screenShake && now >= state.screenShake.endTime) {
                    state.screenShake = null;
                }
            });
        },

        triggerScreenShake: (intensity, duration, decay = true) => {
            // The player asked for less motion: a crash doesn't shake the view
            if (prefersReducedMotion()) return;
            set((state) => {
                state.screenShake = {
                    intensity,
                    duration,
                    endTime: Date.now() + duration,
                    decay,
                };
            });

            // Auto-cleanup
            setTimeout(() => {
                set((state) => {
                    if (state.screenShake?.endTime && state.screenShake.endTime <= Date.now()) {
                        state.screenShake = null;
                    }
                });
            }, duration + 50);
        },

        getScreenShakeOffset: (): Vector2 => {
            const shake = get().screenShake;
            if (!shake) return { x: 0, y: 0 };

            const now = Date.now();
            if (now >= shake.endTime) return { x: 0, y: 0 };

            // Calculate decay progress (0 = just started, 1 = about to end)
            const remaining = shake.endTime - now;
            const progress = 1 - (remaining / Math.max(shake.duration, 1));

            const currentIntensity = shake.decay
                ? shake.intensity * (1 - progress)
                : shake.intensity;

            // Random offset
            return {
                x: (Math.random() - 0.5) * 2 * currentIntensity,
                y: (Math.random() - 0.5) * 2 * currentIntensity,
            };
        },

        triggerSlowMotion: (duration) => {
            set((state) => {
                state.slowMotionUntil = performance.now() + duration;
            });
        },

        clearAllEffects: () => {
            flashStarts = [];
            set((state) => {
                state.ripples = [];
                state.flashes = [];
                state.hoveredSwitchId = null;
                state.hoveredSwitchPosition = null;
                state.screenShake = null;
                state.slowMotionUntil = 0;
            });
        },
    }))
);

// Named Selectors
export const selectRipples = (state: EffectsState) => state.ripples;
export const selectFlashes = (state: EffectsState) => state.flashes;
export const selectHoveredSwitchId = (state: EffectsState) => state.hoveredSwitchId;
export const selectHoveredSwitchPosition = (state: EffectsState) => state.hoveredSwitchPosition;
export const selectScreenShake = (state: EffectsState) => state.screenShake;
