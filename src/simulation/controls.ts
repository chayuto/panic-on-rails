/**
 * Player-facing simulation controls, shared by the toolbar, the train panel,
 * keyboard shortcuts and the headless harness.
 */

import { useSimulationStore } from '../stores/useSimulationStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { trainsLeft } from '../data/collection';
import { pickSpawnLocation } from './spawn';
import type { EdgeId, PartScale, TrainId } from '../types';
import { getRollingStock } from '../data/rollingStock';
import { getPartById } from '../data/catalog';

/**
 * In collection mode, the rolling stock to put on the track: `preferred` if
 * the player has one spare, else any train they own that isn't running and
 * fits the track's `scale`. Null when there's none to spare. In free build
 * there's no limit: returns `preferred` (or undefined for a generic train).
 */
export function nextAvailableStock(preferred?: string, scale?: PartScale): string | undefined | null {
    const collection = useCollectionStore.getState();
    if (collection.mode === 'free') return preferred;
    const left = trainsLeft(collection.ownedTrains, useSimulationStore.getState().trains);
    if (preferred && (left[preferred] ?? 0) > 0) return preferred;
    const fits = (id: string) => !scale || (getRollingStock(id)?.scale ?? 'n-scale') === scale;
    return Object.keys(left).find(id => left[id] > 0 && fits(id)) ?? null;
}

/** The scale of the track an edge belongs to. */
function scaleAt(edgeId: EdgeId): PartScale | undefined {
    const edge = useTrackStore.getState().edges[edgeId];
    return edge ? getPartById(edge.partId)?.scale : undefined;
}

/**
 * Spawn a train at the clearest spot on the layout. In collection mode it's
 * one of the player's own trains. Returns its ID, or null with no track or
 * no train to spare.
 */
export function spawnTrainAtClearestSpot(carriageCount?: number, color?: string, stockId?: string): TrainId | null {
    const { edges, nodes } = useTrackStore.getState();
    const { trains, spawnTrain } = useSimulationStore.getState();
    // A particular train goes on track of its own scale
    const scale = getRollingStock(stockId)?.scale;
    const fitting = scale
        ? Object.fromEntries(Object.entries(edges).filter(([, e]) => getPartById(e.partId)?.scale === scale))
        : edges;
    const spot = pickSpawnLocation(fitting, trains, nodes);
    if (!spot) return null;
    const stock = nextAvailableStock(stockId, scaleAt(spot.edgeId));
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
    const stock = nextAvailableStock(undefined, scaleAt(edgeId));
    if (stock === null) return '';
    const { spawnTrain } = useSimulationStore.getState();
    return stock ? spawnTrain(edgeId, undefined, undefined, undefined, stock) : spawnTrain(edgeId, color);
}

/**
 * Start (or resume) the simulation; spawns a train if there are none. Wrecks
 * stay where they are until the player clears them (`rerailWrecks`, or
 * taking them off the track). No-op without track.
 */
export function startSimulation(): void {
    if (Object.keys(useTrackStore.getState().edges).length === 0) return;
    const sim = useSimulationStore.getState();
    if (Object.keys(sim.trains).length === 0) {
        spawnTrainAtClearestSpot();
    }
    sim.setRunning(true);
}

/**
 * Re-rail every wreck, one at a time so each finds room clear of those
 * before it. Returns the wrecks that found nowhere to go.
 */
export function rerailWrecks(): TrainId[] {
    const wrecks = Object.values(useSimulationStore.getState().trains).filter(t => t.crashed);
    return wrecks.filter(t => !useSimulationStore.getState().rerailTrain(t.id)).map(t => t.id);
}

/** Play/pause toggle. Pausing never leaves Simulate mode. */
export function togglePlayPause(): void {
    if (useSimulationStore.getState().isRunning) {
        useSimulationStore.getState().setRunning(false);
    } else {
        startSimulation();
    }
}
