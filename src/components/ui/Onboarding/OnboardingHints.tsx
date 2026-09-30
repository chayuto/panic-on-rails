/**
 * OnboardingHints - Orchestrates which hints to show based on current stage
 * 
 * Renders the appropriate hint component for the current onboarding stage,
 * and the completion toast. Each hint carries the Skip tutorial link.
 */

import { ArrowLeft, RefreshCw, TrainFront, Plus, Play, PartyPopper, Package } from 'lucide-react';
import { useOnboardingStore } from '../../../stores/useOnboardingStore';
import { useModeStore } from '../../../stores/useModeStore';
import { useCollectionStore } from '../../../stores/useCollectionStore';
import { Hint } from './Hint';
import { Toast } from './Toast';
import { COMPLETION_TOAST_MS } from './OnboardingProvider';
import './Onboarding.css';

export function OnboardingHints() {
    const stage = useOnboardingStore(s => s.stage);
    const primaryMode = useModeStore(s => s.primaryMode);

    // Don't render anything if onboarding is complete
    if (stage === 'complete') {
        return null;
    }

    return (
        <>
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
 * Stage 1: Point user to PartsBin to drag their first track, or to the
 * shop, where their box's layout builds itself
 */
function FirstTrackHint() {
    const collection = useCollectionStore(s => s.mode) === 'collection';
    return (
        <Hint
            id="first-track"
            position="right"
            icon={<ArrowLeft size={20} />}
            style={{
                top: '180px',
                left: '240px',
            }}
        >
            Drag a track from the parts bin to start building! Or open the shop{' '}
            <Package size={14} style={{ verticalAlign: 'middle' }} /> above and build
            {collection ? ' your box\'s' : ' a set\'s'} layout.
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
            icon={<RefreshCw size={20} />}
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
            icon={<TrainFront size={20} />}
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
            icon={<Plus size={20} />}
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
            icon={<Play size={20} />}
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
            icon={<PartyPopper size={20} />}
            title="You did it!"
            duration={COMPLETION_TOAST_MS}
        >
            Trains are running. The editor's signals, sensors and wires are unlocked: a
            signal at red holds trains, and a click on a set of points reroutes them.
        </Toast>
    );
}
