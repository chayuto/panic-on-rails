/**
 * useOnboardingStore - Manages tutorial/onboarding state
 * 
 * Tracks user progression through the first-time user experience:
 * 1. new_user - Just arrived, hasn't done anything
 * 2. first_track - Placed their first track piece
 * 3. loop_created - Connected tracks into a loop
 * 4. mode_switched - Switched to Simulate mode
 * 5. train_placed - Placed a train on the track
 * 6. simulation_run - Started the simulation
 * 7. complete - Onboarding finished
 * 
 * State persists to localStorage so returning users skip onboarding.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Onboarding stages in order of progression
export type OnboardingStage =
    | 'new_user'
    | 'first_track'
    | 'loop_created'
    | 'mode_switched'
    | 'train_placed'
    | 'simulation_run'
    | 'complete';

// Ordered array for stage comparison
const STAGE_ORDER: OnboardingStage[] = [
    'new_user',
    'first_track',
    'loop_created',
    'mode_switched',
    'train_placed',
    'simulation_run',
    'complete',
];

interface OnboardingState {
    // Current stage in the onboarding flow
    stage: OnboardingStage;

    // Hints that have been shown (to avoid repeating)
    hintsShown: string[];

    // Hints user has explicitly dismissed
    dismissedHints: string[];

    // Whether advanced features should be visible
    advancedFeaturesUnlocked: boolean;
}

interface OnboardingActions {
    // Progress to the next stage (or a specific stage)
    advanceStage: (toStage?: OnboardingStage) => void;

    // Skip onboarding entirely (for experienced users)
    skipOnboarding: () => void;

    // Reset onboarding (for testing or if user wants to redo)
    resetOnboarding: () => void;

    // Track that a hint was shown
    markHintShown: (hintId: string) => void;

    // Track that user dismissed a hint
    dismissHint: (hintId: string) => void;

    // Check if a hint should be shown
    shouldShowHint: (hintId: string) => boolean;

    // Check if current stage is at or past a given stage
    isStageAtLeast: (stage: OnboardingStage) => boolean;

    // Check if onboarding is active (not complete)
    isOnboardingActive: () => boolean;
}

type OnboardingStore = OnboardingState & OnboardingActions;

const STORAGE_KEY = 'panic-on-rails-onboarding';

// Helper to get stage index for comparison
function getStageIndex(stage: OnboardingStage): number {
    return STAGE_ORDER.indexOf(stage);
}

export const useOnboardingStore = create<OnboardingStore>()(
    persist(
        (set, get) => ({
            // Initial state
            stage: 'new_user',
            hintsShown: [],
            dismissedHints: [],
            advancedFeaturesUnlocked: false,

            advanceStage: (toStage) => {
                const currentIndex = getStageIndex(get().stage);

                if (toStage) {
                    // Advance to specific stage (only if it's ahead of current)
                    const targetIndex = getStageIndex(toStage);
                    if (targetIndex > currentIndex) {
                        set({
                            stage: toStage,
                            // Unlock advanced features when onboarding completes
                            advancedFeaturesUnlocked: toStage === 'complete',
                        });
                    }
                } else {
                    // Advance to next stage in sequence
                    if (currentIndex < STAGE_ORDER.length - 1) {
                        const nextStage = STAGE_ORDER[currentIndex + 1];
                        set({
                            stage: nextStage,
                            advancedFeaturesUnlocked: nextStage === 'complete',
                        });
                    }
                }
            },

            skipOnboarding: () => {
                set({
                    stage: 'complete',
                    advancedFeaturesUnlocked: true,
                });
            },

            resetOnboarding: () => {
                set({
                    stage: 'new_user',
                    hintsShown: [],
                    dismissedHints: [],
                    advancedFeaturesUnlocked: false,
                });
            },

            markHintShown: (hintId) => {
                const { hintsShown } = get();
                if (!hintsShown.includes(hintId)) {
                    set({ hintsShown: [...hintsShown, hintId] });
                }
            },

            dismissHint: (hintId) => {
                const { dismissedHints } = get();
                if (!dismissedHints.includes(hintId)) {
                    set({ dismissedHints: [...dismissedHints, hintId] });
                }
            },

            shouldShowHint: (hintId) => {
                const { dismissedHints } = get();
                return !dismissedHints.includes(hintId);
            },

            isStageAtLeast: (stage) => {
                const currentIndex = getStageIndex(get().stage);
                const targetIndex = getStageIndex(stage);
                return currentIndex >= targetIndex;
            },

            isOnboardingActive: () => {
                return get().stage !== 'complete';
            },
        }),
        {
            name: STORAGE_KEY,
            // Only persist certain fields
            partialize: (state) => ({
                stage: state.stage,
                hintsShown: state.hintsShown,
                dismissedHints: state.dismissedHints,
                advancedFeaturesUnlocked: state.advancedFeaturesUnlocked,
            }),
        }
    )
);

// Selector for checking if in a specific stage
export const selectIsStage = (stage: OnboardingStage) =>
    (state: OnboardingStore) => state.stage === stage;

// Selector for checking if advanced features are unlocked
export const selectAdvancedUnlocked = (state: OnboardingStore) =>
    state.advancedFeaturesUnlocked;

// Selector for checking if onboarding is active
export const selectOnboardingActive = (state: OnboardingStore) =>
    state.stage !== 'complete';
