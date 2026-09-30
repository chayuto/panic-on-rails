/**
 * Put a shared layout on the table, the way building a set's plan does:
 * undoable, and in free build, since a shared layout isn't the player's own
 * collection.
 */

import { applyTemplate } from '../../../data/templates';
import { getPartById } from '../../../data/catalog';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useLogicStore } from '../../../stores/useLogicStore';
import { useSimulationStore } from '../../../stores/useSimulationStore';
import { useModeStore } from '../../../stores/useModeStore';
import { useHistoryStore } from '../../../stores/useHistoryStore';
import { useCollectionStore } from '../../../stores/useCollectionStore';
import { useEditorStore } from '../../../stores/useEditorStore';
import { spawnLayoutTrain } from '../../../simulation/controls';
import { sharedLayoutTemplate } from '../../../utils/shareLayout';
import { fitViewToLayout } from '../../../utils/viewFit';
import type { TemplatePart } from '../../../data/templates/types';

export function openSharedLayout(pieces: TemplatePart[]): void {
    // Undo brings back whatever was on the table before
    useHistoryStore.getState().record();

    const sim = useSimulationStore.getState();
    sim.setRunning(false);
    sim.clearTrains();
    sim.clearDebris();
    sim.clearError();
    useLogicStore.getState().clearLogic();
    useModeStore.getState().enterEditMode();
    useCollectionStore.getState().setMode('free');

    const track = useTrackStore.getState();
    applyTemplate(
        sharedLayoutTemplate(pieces),
        track.clearLayout,
        track.addTrack,
        () => useTrackStore.getState().nodes,
        track.connectNodes,
        spawnLayoutTrain,
        () => { /* a shared layout arrives stopped: the player adds trains */ },
        false,
        track.setNodeHeights
    );

    // Show the layout's own system in the parts bin
    const scale = getPartById(pieces[0]?.partId ?? '')?.scale;
    if (scale) useEditorStore.getState().setSelectedSystem(scale);
    fitViewToLayout();
}
