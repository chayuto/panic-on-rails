/**
 * Player-facing simulation controls, shared by the toolbar, the train panel,
 * keyboard shortcuts and the headless harness.
 */

import { useSimulationStore } from '../stores/useSimulationStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { trainsLeft } from '../data/collection';
import { pickSpawnLocation } from './spawn';
import type { EdgeId, TrainId } from '../types';

/**
 * In collection mode, the rolling stock to put on the track: `preferred` if
 * the player has one spare, else any train they own that isn't running.
 * Null when every owned train is already on the track. In free build
 * there's no limit: returns `preferred` (or undefined for a generic train).
 */
export function nextAvailableStock(preferred?: string): string | undefined | null {
    const collection = useCollectionStore.getState();
    if (collection.mode === 'free') return preferred;
    const left = trainsLeft(collection.ownedTrains, useSimulationStore.getState().trains);
    if (preferred && (left[preferred] ?? 0) > 0) return preferred;
    return Object.keys(left).find(id => left[id] > 0) ?? null;
}

/**
 * Spawn a train at the clearest spot on the layout. In collection mode it's
 * one of the player's own trains. Returns its ID, or null with no track or
 * no train to spare.
 */
export function spawnTrainAtClearestSpot(carriageCount?: number, color?: string, stockId?: string): TrainId | null {
    const { edges } = useTrackStore.getState();
    const { trains, spawnTrain } = useSimulationStore.getState();
    const spot = pickSpawnLocation(edges, trains);
    if (!spot) return null;
    const stock = nextAvailableStock(stockId);
    if (stock === null) return null;
    return stock
        ? spawnTrain(spot.edgeId, undefined, undefined, spot.distance, stock)
        : spawnTrain(spot.edgeId, color, carriageCount, spot.distance);
}

/**
 * Spawn a train where a layout (template or set plan) puts one. In
 * collection mode it's one of the player's own trains, or nothing if they
 * have none to spare. Returns the train ID, or '' if none was placed.
 */
export function spawnLayoutTrain(edgeId: EdgeId, color?: string): TrainId {
    const stock = nextAvailableStock();
    if (stock === null) return '';
    const { spawnTrain } = useSimulationStore.getState();
    return stock ? spawnTrain(edgeId, undefined, undefined, undefined, stock) : spawnTrain(edgeId, color);
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
