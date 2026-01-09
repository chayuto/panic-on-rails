/**
 * SkipTutorialButton - Allows experienced users to bypass onboarding
 * 
 * Shown during active onboarding. Clicking it immediately
 * completes onboarding and unlocks all features.
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
            Skip tutorial — I know what I'm doing
        </button>
    );
}
