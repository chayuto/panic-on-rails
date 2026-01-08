/**
 * Effects Store
 * 
 * Zustand store for managing visual effects state.
 * Handles ripples, flashes, and other transient effects.
 */

import { create } from 'zustand';
import type { Vector2 } from '../types';

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

    // Actions
    triggerRipple: (position: Vector2, options?: Partial<RippleEffect>) => void;
    triggerFlash: (position: Vector2, options?: Partial<FlashEffect>) => void;
    setHoveredSwitch: (nodeId: string | null, position?: Vector2 | null) => void;
    triggerScreenShake: (intensity: number, duration: number, decay?: boolean) => void;
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

export const useEffectsStore = create<EffectsState>((set, get) => ({
    ripples: [],
    flashes: [],
    hoveredSwitchId: null,
    hoveredSwitchPosition: null,
    screenShake: null,

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

        set(state => ({
            ripples: [...state.ripples, ripple],
        }));

        // Auto-cleanup after duration
        setTimeout(() => {
            set(state => ({
                ripples: state.ripples.filter(r => r.id !== ripple.id),
            }));
        }, ripple.duration + 50);
    },

    triggerFlash: (position, options = {}) => {
        const flash: FlashEffect = {
            id: generateEffectId(),
            position,
            startTime: Date.now(),
            duration: options.duration ?? DEFAULT_FLASH.duration,
            color: options.color ?? DEFAULT_FLASH.color,
            radius: options.radius ?? DEFAULT_FLASH.radius,
        };

        set(state => ({
            flashes: [...state.flashes, flash],
        }));

        // Auto-cleanup after duration
        setTimeout(() => {
            set(state => ({
                flashes: state.flashes.filter(f => f.id !== flash.id),
            }));
        }, flash.duration + 50);
    },

    setHoveredSwitch: (nodeId, position = null) => {
        set({
            hoveredSwitchId: nodeId,
            hoveredSwitchPosition: position,
        });
    },

    cleanupExpiredEffects: () => {
        const now = Date.now();
        set(state => ({
            ripples: state.ripples.filter(r => now - r.startTime < r.duration),
            flashes: state.flashes.filter(f => now - f.startTime < f.duration),
            screenShake: state.screenShake && now < state.screenShake.endTime
                ? state.screenShake
                : null,
        }));
    },

    triggerScreenShake: (intensity, duration, decay = true) => {
        set({
            screenShake: {
                intensity,
                endTime: Date.now() + duration,
                decay,
            },
        });

        // Auto-cleanup
        setTimeout(() => {
            set(state => ({
                screenShake: state.screenShake?.endTime === Date.now() + duration
                    ? null
                    : state.screenShake,
            }));
        }, duration + 50);
    },

    getScreenShakeOffset: (): Vector2 => {
        const shake = get().screenShake;
        if (!shake) return { x: 0, y: 0 };

        const now = Date.now();
        if (now >= shake.endTime) return { x: 0, y: 0 };

        // Calculate remaining intensity
        const remaining = shake.endTime - now;
        const totalDuration = shake.endTime - (shake.endTime - remaining);
        const progress = 1 - (remaining / Math.max(totalDuration, 1));

        const currentIntensity = shake.decay
            ? shake.intensity * (1 - progress)
            : shake.intensity;

        // Random offset
        return {
            x: (Math.random() - 0.5) * 2 * currentIntensity,
            y: (Math.random() - 0.5) * 2 * currentIntensity,
        };
    },

    clearAllEffects: () => {
        set({
            ripples: [],
            flashes: [],
            hoveredSwitchId: null,
            hoveredSwitchPosition: null,
            screenShake: null,
        });
    },
}));
