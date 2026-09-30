/**
 * OnboardingProvider - Monitors app state and advances onboarding stages
 * 
 * Subscribes to relevant stores and triggers stage advancement when:
 * - Track is placed → advance to 'first_track'
 * - Loop is detected → advance to 'loop_created'
 * - Mode changes to simulate → advance to 'mode_switched'
 * - Train is placed → advance to 'train_placed'
 * - Simulation starts → advance to 'simulation_run' → 'complete'
 */

import { useEffect, type ReactNode } from 'react';
import { useOnboardingStore } from '../../../stores/useOnboardingStore';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useModeStore } from '../../../stores/useModeStore';
import { useSimulationStore } from '../../../stores/useSimulationStore';
import { hasClosedLoop } from '../../../utils/graphAnalysis';
import { logger } from '../../../utils/logger';

/** How long the "You did it!" toast stays up before onboarding completes */
export const COMPLETION_TOAST_MS = 5000;

interface OnboardingProviderProps {
    children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
    const { stage, advanceStage, isOnboardingActive } = useOnboardingStore();

    // Get state from other stores
    const edges = useTrackStore(s => s.edges);
    const primaryMode = useModeStore(s => s.primaryMode);
    const trains = useSimulationStore(s => s.trains);
    const isRunning = useSimulationStore(s => s.isRunning);

    // Get edge count (edges is a Record<EdgeId, TrackEdge>)
    const edgeCount = Object.keys(edges).length;
    const trainCount = Object.keys(trains).length;

    // Stage: first_track - Detect when first track is placed
    useEffect(() => {
        if (stage === 'new_user' && edgeCount > 0) {
            advanceStage('first_track');
        }
    }, [stage, edgeCount, advanceStage]);

    // Stage: loop_created - Detect when the track actually closes into a loop
    const loopClosed = useTrackStore(s => hasClosedLoop(s.edges));
    useEffect(() => {
        if (stage === 'first_track' && loopClosed) {
            advanceStage('loop_created');
        }
    }, [stage, loopClosed, advanceStage]);

    // Stage: mode_switched - Detect switch to simulate mode
    useEffect(() => {
        if (stage === 'loop_created' && primaryMode === 'simulate') {
            advanceStage('mode_switched');
        }
    }, [stage, primaryMode, advanceStage]);

    // Stage: train_placed - Detect when a train is added
    useEffect(() => {
        if (stage === 'mode_switched' && trainCount > 0) {
            advanceStage('train_placed');
        }
    }, [stage, trainCount, advanceStage]);

    // Stage: simulation_run - Detect when simulation starts
    useEffect(() => {
        if (stage === 'train_placed' && isRunning) {
            advanceStage('simulation_run');
            // Complete once the celebration toast has had its full time on screen
            setTimeout(() => {
                advanceStage('complete');
            }, COMPLETION_TOAST_MS);
        }
    }, [stage, isRunning, advanceStage]);

    // Debug logging in development
    useEffect(() => {
        if (import.meta.env.DEV && isOnboardingActive()) {
            logger.debug('Onboarding', 'Stage:', stage);
        }
    }, [stage, isOnboardingActive]);

    return <>{children}</>;
}
