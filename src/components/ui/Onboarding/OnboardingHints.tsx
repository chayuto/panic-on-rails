/**
 * OnboardingHints - Orchestrates which hints to show based on current stage
 * 
 * Renders the appropriate hint component for the current onboarding stage.
 * Also handles the skip tutorial button and completion toast.
 */

import { useOnboardingStore } from '../../../stores/useOnboardingStore';
import { useModeStore } from '../../../stores/useModeStore';
import { Hint } from './Hint';
import { Toast } from './Toast';
import { SkipTutorialButton } from './SkipTutorialButton';
import './Onboarding.css';

export function OnboardingHints() {
    const { stage, isOnboardingActive } = useOnboardingStore();
    const primaryMode = useModeStore(s => s.primaryMode);

    // Don't render anything if onboarding is complete
    if (!isOnboardingActive()) {
        return null;
    }

    return (
        <>
            {/* Skip button always available during onboarding */}
            <SkipTutorialButton />

            {/* Stage-specific hints */}
            {stage === 'new_user' && <FirstTrackHint />}
            {stage === 'first_track' && <LoopCreationHint />}
            {stage === 'loop_created' && <ModeSwitchHint />}
            {stage === 'mode_switched' && primaryMode === 'simulate' && <AddTrainHint />}
            {stage === 'train_placed' && <StartSimulationHint />}
            {stage === 'simulation_run' && <CompletionToast />}
        </>
    );
}

/**
 * Stage 1: Point user to PartsBin to drag their first track
 */
function FirstTrackHint() {
    return (
        <Hint
            id="first-track"
            position="right"
            icon="👈"
            style={{
                top: '180px',
                left: '240px',
            }}
        >
            Drag a track from the left to start building!
        </Hint>
    );
}

/**
 * Stage 2: Encourage user to complete a loop
 */
function LoopCreationHint() {
    return (
        <Hint
            id="loop-creation"
            position="bottom"
            icon="🔄"
            style={{
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
            }}
        >
            Great! Keep connecting tracks to form a loop.
        </Hint>
    );
}

/**
 * Stage 3: Spotlight the mode toggle to switch to simulate
 */
function ModeSwitchHint() {
    return (
        <Hint
            id="mode-switch"
            position="bottom"
            icon="🚂"
            shortcut="M"
            style={{
                top: '60px',
                left: '180px',
            }}
        >
            Ready to run trains! Click <strong>Simulate</strong> to switch modes.
        </Hint>
    );
}

/**
 * Stage 4: Point to the Add Train button
 */
function AddTrainHint() {
    return (
        <Hint
            id="add-train"
            position="right"
            icon="➕"
            style={{
                top: '120px',
                left: '240px',
            }}
        >
            Click <strong>Add Train</strong> to place a train on your track!
        </Hint>
    );
}

/**
 * Stage 5: Encourage starting the simulation
 */
function StartSimulationHint() {
    return (
        <Hint
            id="start-simulation"
            position="bottom"
            icon="▶️"
            shortcut="Space"
            style={{
                top: '60px',
                left: '50%',
                transform: 'translateX(-50%)',
            }}
        >
            Press <strong>Play</strong> to start your train!
        </Hint>
    );
}

/**
 * Completion: Celebratory toast when onboarding finishes
 */
function CompletionToast() {
    return (
        <Toast
            variant="success"
            icon="🎉"
            title="You did it!"
            duration={5000}
        >
            You're ready to build amazing tracks. Advanced tools are now unlocked!
        </Toast>
    );
}
