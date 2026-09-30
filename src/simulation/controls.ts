/**
 * Player-facing simulation controls, shared by the toolbar, the train panel,
 * keyboard shortcuts and the headless harness.
 */

import { useSimulationStore } from '../stores/useSimulationStore';
import { useTrackStore } from '../stores/useTrackStore';
import { useCollectionStore } from '../stores/useCollectionStore';
import { trainsLeft } from '../data/collection';
import { pickSpawnLocation, standingSpot } from './spawn';
import { finishSession, startSession } from './session';
import type { EdgeId, PartScale, TrackEdge, Train, TrainId } from '../types';
import { genericCarLengths, getRollingStock, trainLength } from '../data/rollingStock';
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

/** The track of one scale. */
function ofScale(edges: Record<EdgeId, TrackEdge>, scale: PartScale): Record<EdgeId, TrackEdge> {
    return Object.fromEntries(Object.entries(edges).filter(([, e]) => (getPartById(e.partId)?.scale ?? 'n-scale') === scale));
}

/** What adding a train did: put one on, or why not. */
export type AddTrainResult = 'added' | 'no-track' | 'no-train' | 'no-room';

type Placement =
    | { trainId: TrainId }
    | { refused: 'no-track' | 'no-train' }
    | { refused: 'no-room'; name: string; length: number; full: boolean };

/**
 * Put a train on at the clearest spot where all its cars stand on the track.
 * In collection mode it's one of the player's own trains.
 */
function placeTrain(carriageCount?: number, color?: string, stockId?: string): Placement {
    const { edges, nodes } = useTrackStore.getState();
    const { trains, spawnTrain } = useSimulationStore.getState();
    // A particular train goes on track of its own scale
    const asked = getRollingStock(stockId)?.scale;
    const clearest = pickSpawnLocation(asked ? ofScale(edges, asked) : edges, trains, nodes);
    if (!clearest) return { refused: 'no-track' };
    const stock = nextAvailableStock(stockId, scaleAt(clearest.edgeId));
    if (stock === null) return { refused: 'no-train' };

    // The train it would be: its model's cars, or free build's generic ones
    const model = getRollingStock(stock);
    const scale = model?.scale ?? scaleAt(clearest.edgeId) ?? 'n-scale';
    const carLengths = model?.carLengths ?? genericCarLengths(carriageCount ?? 1, scale);
    const train: Train = {
        id: 'new-train', currentEdgeId: clearest.edgeId, distanceAlongEdge: 0, direction: 1, speed: 0, color: '',
        carLengths, carriageCount: carLengths.length, scale,
    };
    const track = ofScale(edges, scale);
    const spot = standingSpot(train, track, edges, trains, nodes);
    if (!spot) {
        // Room on the bare track: it's the other trains in the way
        const full = standingSpot(train, track, edges, {}, nodes) !== null;
        return { refused: 'no-room', name: model?.name ?? 'train', length: trainLength({ carLengths }), full };
    }
    return {
        trainId: stock
            ? spawnTrain(spot.edgeId, undefined, undefined, spot.distance, stock)
            : spawnTrain(spot.edgeId, color, carriageCount, spot.distance),
    };
}

/**
 * Spawn a train at the clearest spot on the layout where all its cars stand
 * on the track. In collection mode it's one of the player's own trains.
 * Returns its ID, or null with no track, no train to spare, or no room.
 */
export function spawnTrainAtClearestSpot(carriageCount?: number, color?: string, stockId?: string): TrainId | null {
    const placed = placeTrain(carriageCount, color, stockId);
    return 'trainId' in placed ? placed.trainId : null;
}

/**
 * Add a train as the player's buttons do (`spawnTrainAtClearestSpot`), and
 * say what happened. When there's no room for it, the train panel says why.
 */
export function addTrain(carriageCount?: number, stockId?: string): AddTrainResult {
    const placed = placeTrain(carriageCount, undefined, stockId);
    const sim = useSimulationStore.getState();
    if ('trainId' in placed) {
        sim.setNotice(null);
        return 'added';
    }
    if (placed.refused === 'no-room') {
        const cm = Math.round(placed.length / 10);
        sim.setNotice(placed.full
            ? `No room for the ${placed.name}: the track is full of trains.`
            : `No room for the ${placed.name}: it's ${cm} cm long, longer than any stretch of this track.`);
    }
    return placed.refused;
}

/**
 * Spawn a train where a layout (template or set plan) puts one: the
 * `preferred` rolling stock if the layout names one (a train set's own
 * train). In collection mode it's one of the player's own trains, that one
 * if they have it spare, or nothing if they have none to spare. Returns
 * the train ID, or '' if none was placed.
 */
export function spawnLayoutTrain(edgeId: EdgeId, color?: string, preferred?: string): TrainId {
    const stock = nextAvailableStock(preferred, scaleAt(edgeId));
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
        addTrain();
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

/**
 * Start an operating session: SESSION.MINUTES of railway time, tallied.
 * Starts the trains if they're standing.
 */
export function beginSession(): void {
    const sim = useSimulationStore.getState();
    sim.setSessionResult(null);
    sim.setSession(startSession(sim.simElapsed));
    if (!sim.isRunning) startSimulation();
}

/** End the session now. Cut short, it earns no bonus. */
export function endSessionEarly(): void {
    const { session, simElapsed, setSession, setSessionResult } = useSimulationStore.getState();
    if (!session) return;
    setSessionResult(finishSession(session, simElapsed));
    setSession(null);
}

/** Play/pause toggle. Pausing never leaves Simulate mode. */
export function togglePlayPause(): void {
    if (useSimulationStore.getState().isRunning) {
        useSimulationStore.getState().setRunning(false);
    } else {
        startSimulation();
    }
}
