/**
 * Tests for useOnboardingStore
 * 
 * Tests the onboarding state management including:
 * - Stage progression
 * - Skip functionality
 * - Hint tracking
 * - Persistence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from '../useOnboardingStore';

describe('useOnboardingStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useOnboardingStore.getState().resetOnboarding();
    });

    describe('initial state', () => {
        it('starts with new_user stage', () => {
            const { stage } = useOnboardingStore.getState();
            expect(stage).toBe('new_user');
        });

        it('starts with advanced features locked', () => {
            const { advancedFeaturesUnlocked } = useOnboardingStore.getState();
            expect(advancedFeaturesUnlocked).toBe(false);
        });

        it('starts with empty hints shown', () => {
            const { hintsShown } = useOnboardingStore.getState();
            expect(hintsShown).toEqual([]);
        });

        it('starts with empty dismissed hints', () => {
            const { dismissedHints } = useOnboardingStore.getState();
            expect(dismissedHints).toEqual([]);
        });
    });

    describe('advanceStage', () => {
        it('advances to next stage in sequence', () => {
            const store = useOnboardingStore.getState();

            expect(store.stage).toBe('new_user');

            store.advanceStage();
            expect(useOnboardingStore.getState().stage).toBe('first_track');

            store.advanceStage();
            expect(useOnboardingStore.getState().stage).toBe('loop_created');

            store.advanceStage();
            expect(useOnboardingStore.getState().stage).toBe('mode_switched');

            store.advanceStage();
            expect(useOnboardingStore.getState().stage).toBe('train_placed');

            store.advanceStage();
            expect(useOnboardingStore.getState().stage).toBe('simulation_run');

            store.advanceStage();
            expect(useOnboardingStore.getState().stage).toBe('complete');
        });

        it('advances to specific stage when provided', () => {
            const store = useOnboardingStore.getState();

            store.advanceStage('loop_created');
            expect(useOnboardingStore.getState().stage).toBe('loop_created');
        });

        it('does not go backwards when advancing to earlier stage', () => {
            const store = useOnboardingStore.getState();

            store.advanceStage('mode_switched');
            expect(useOnboardingStore.getState().stage).toBe('mode_switched');

            // Try to go back to earlier stage - should be ignored
            store.advanceStage('first_track');
            expect(useOnboardingStore.getState().stage).toBe('mode_switched');
        });

        it('unlocks advanced features when stage becomes complete', () => {
            const store = useOnboardingStore.getState();

            expect(useOnboardingStore.getState().advancedFeaturesUnlocked).toBe(false);

            store.advanceStage('complete');
            expect(useOnboardingStore.getState().advancedFeaturesUnlocked).toBe(true);
        });

        it('does not advance past complete', () => {
            const store = useOnboardingStore.getState();

            store.advanceStage('complete');
            store.advanceStage();

            expect(useOnboardingStore.getState().stage).toBe('complete');
        });
    });

    describe('skipOnboarding', () => {
        it('sets stage to complete', () => {
            const store = useOnboardingStore.getState();

            store.skipOnboarding();
            expect(useOnboardingStore.getState().stage).toBe('complete');
        });

        it('unlocks advanced features', () => {
            const store = useOnboardingStore.getState();

            store.skipOnboarding();
            expect(useOnboardingStore.getState().advancedFeaturesUnlocked).toBe(true);
        });
    });

    describe('resetOnboarding', () => {
        it('resets all state to initial values', () => {
            const store = useOnboardingStore.getState();

            // First, advance the state
            store.advanceStage('complete');
            store.markHintShown('test-hint');
            store.dismissHint('other-hint');

            // Verify state changed
            expect(useOnboardingStore.getState().stage).toBe('complete');
            expect(useOnboardingStore.getState().hintsShown).toContain('test-hint');

            // Reset
            store.resetOnboarding();

            // Verify all state reset
            const resetState = useOnboardingStore.getState();
            expect(resetState.stage).toBe('new_user');
            expect(resetState.advancedFeaturesUnlocked).toBe(false);
            expect(resetState.hintsShown).toEqual([]);
            expect(resetState.dismissedHints).toEqual([]);
        });
    });

    describe('hint tracking', () => {
        it('markHintShown adds hint to hintsShown', () => {
            const store = useOnboardingStore.getState();

            store.markHintShown('welcome-hint');
            expect(useOnboardingStore.getState().hintsShown).toContain('welcome-hint');
        });

        it('markHintShown does not duplicate hints', () => {
            const store = useOnboardingStore.getState();

            store.markHintShown('test-hint');
            store.markHintShown('test-hint');

            const { hintsShown } = useOnboardingStore.getState();
            expect(hintsShown.filter(h => h === 'test-hint').length).toBe(1);
        });

        it('dismissHint adds hint to dismissedHints', () => {
            const store = useOnboardingStore.getState();

            store.dismissHint('annoying-hint');
            expect(useOnboardingStore.getState().dismissedHints).toContain('annoying-hint');
        });

        it('dismissHint does not duplicate', () => {
            const store = useOnboardingStore.getState();

            store.dismissHint('test-hint');
            store.dismissHint('test-hint');

            const { dismissedHints } = useOnboardingStore.getState();
            expect(dismissedHints.filter(h => h === 'test-hint').length).toBe(1);
        });

        it('shouldShowHint returns true for non-dismissed hints', () => {
            const store = useOnboardingStore.getState();

            expect(store.shouldShowHint('new-hint')).toBe(true);
        });

        it('shouldShowHint returns false for dismissed hints', () => {
            const store = useOnboardingStore.getState();

            store.dismissHint('dismissed-hint');
            expect(useOnboardingStore.getState().shouldShowHint('dismissed-hint')).toBe(false);
        });
    });

    describe('isStageAtLeast', () => {
        it('returns true when at target stage', () => {
            const store = useOnboardingStore.getState();

            expect(store.isStageAtLeast('new_user')).toBe(true);
        });

        it('returns true when past target stage', () => {
            const store = useOnboardingStore.getState();

            store.advanceStage('loop_created');
            expect(useOnboardingStore.getState().isStageAtLeast('first_track')).toBe(true);
        });

        it('returns false when before target stage', () => {
            const store = useOnboardingStore.getState();

            expect(store.isStageAtLeast('complete')).toBe(false);
        });
    });

    describe('isOnboardingActive', () => {
        it('returns true when not complete', () => {
            const store = useOnboardingStore.getState();

            expect(store.isOnboardingActive()).toBe(true);

            store.advanceStage('loop_created');
            expect(useOnboardingStore.getState().isOnboardingActive()).toBe(true);
        });

        it('returns false when complete', () => {
            const store = useOnboardingStore.getState();

            store.skipOnboarding();
            expect(useOnboardingStore.getState().isOnboardingActive()).toBe(false);
        });
    });
});
