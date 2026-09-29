/**
 * Player-facing simulation controls, shared by the toolbar, the train panel,
 * keyboard shortcuts and the headless harness.
 */

import { useSimulationStore } from '../stores/useSimulationStore';
import { useTrackStore } from '../stores/useTrackStore';
import { pickSpawnLocation } from './spawn';
import type { TrainId } from '../types';

/** Spawn a train at the clearest spot on the layout. Returns its ID, or null with no track. */
export function spawnTrainAtClearestSpot(carriageCount?: number, color?: string): TrainId | null {
    const { edges } = useTrackStore.getState();
    const { trains, spawnTrain } = useSimulationStore.getState();
    const spot = pickSpawnLocation(edges, trains);
    return spot ? spawnTrain(spot.edgeId, color, carriageCount, spot.distance) : null;
}

/**
 * Start (or restart) the simulation. After a crash, clears the wreckage and
 * the crashed trains first (survivors keep running); spawns a train if none
 * are left. No-op without track.
 */
export function startSimulation(): void {
    if (Object.keys(useTrackStore.getState().edges).length === 0) return;
    const sim = useSimulationStore.getState();
    const crashed = Object.values(sim.trains).filter(t => t.crashed);
    if (crashed.length > 0) {
        crashed.forEach(t => sim.removeTrain(t.id));
        sim.clearDebris();
        sim.clearError();
        sim.clearLog();
    }
    if (Object.keys(useSimulationStore.getState().trains).length === 0) {
        spawnTrainAtClearestSpot();
    }
    sim.setRunning(true);
}

/** Play/pause toggle. Pausing never leaves Simulate mode. */
export function togglePlayPause(): void {
    if (useSimulationStore.getState().isRunning) {
        useSimulationStore.getState().setRunning(false);
    } else {
        startSimulation();
    }
}
