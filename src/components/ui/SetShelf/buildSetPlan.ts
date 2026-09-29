/**
 * Put a set's layout plan on the table and start the trains, like
 * unpacking the box and following the manual.
 */

import { applyTemplate } from '../../../data/templates';
import { planToTemplate, type LayoutPlan, type TrackSet } from '../../../data/sets';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useLogicStore } from '../../../stores/useLogicStore';
import { useSimulationStore } from '../../../stores/useSimulationStore';
import { useModeStore } from '../../../stores/useModeStore';
import { useHistoryStore } from '../../../stores/useHistoryStore';
import { fitViewToLayout } from '../../../utils/viewFit';

export function buildSetPlan(set: TrackSet, plan: LayoutPlan): void {
    const template = planToTemplate(plan, { name: `${set.badge ?? set.productCode} · ${plan.name}` });

    // Undo brings back whatever was on the table before
    useHistoryStore.getState().record();

    const sim = useSimulationStore.getState();
    sim.setRunning(false);
    sim.clearTrains();
    sim.clearDebris();
    sim.clearError();
    useLogicStore.getState().clearLogic();
    useModeStore.getState().enterEditMode();

    const track = useTrackStore.getState();
    applyTemplate(
        template,
        track.clearLayout,
        track.addTrack,
        () => useTrackStore.getState().nodes,
        track.connectNodes,
        sim.spawnTrain,
        () => {
            useModeStore.getState().enterSimulateMode();
            useSimulationStore.getState().setRunning(true);
        },
        true
    );
    fitViewToLayout();
}
