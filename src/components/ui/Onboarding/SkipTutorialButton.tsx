/**
 * SkipTutorialButton - Allows experienced users to bypass onboarding
 *
 * A link at the foot of each onboarding hint, rather than a button floating
 * over the canvas, where it covered track. Clicking it immediately completes
 * onboarding and unlocks all features.
 */

import { useCallback } from 'react';
import { useOnboardingStore } from '../../../stores/useOnboardingStore';
import './Onboarding.css';

export function SkipTutorialButton() {
    const { skipOnboarding, isOnboardingActive } = useOnboardingStore();

    const handleSkip = useCallback(() => {
        skipOnboarding();
    }, [skipOnboarding]);

    if (!isOnboardingActive()) {
        return null;
    }

    return (
        <button
            className="onboarding-skip"
            onClick={handleSkip}
            title="Skip tutorial and unlock all features"
        >
            Skip tutorial
        </button>
    );
}
