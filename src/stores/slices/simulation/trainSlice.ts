/**
 * Train Management Slice
 */

import type { Train, TrainId } from '../../../types';
import type { SimulationSliceCreator, SimulationStateData, TrainSlice } from './types';
import { DRIVING } from '../../../simulation/driving';
import { genericCarLengths, getRollingStock, topSpeedOf } from '../../../data/rollingStock';
import { getPartById } from '../../../data/catalog';
import { sizeOf } from '../../../config/scales';
import { reverseConsist } from '../../../utils/trainCars';
import { rerail } from '../../../simulation/wreckage';
import { useTrackStore } from '../../useTrackStore';

const TRAIN_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];
let trainCounter = 0;

/** Sweep up the debris that came off a train. */
function sweepDebris(state: SimulationStateData, trainId: TrainId): void {
    if (state.crashedParts.some(p => p.trainId === trainId)) {
        state.crashedParts = state.crashedParts.filter(p => p.trainId !== trainId);
    }
}

export const createTrainSlice: SimulationSliceCreator<TrainSlice> = (set, get) => ({
    /**
     * Spawn a new train on a specific edge.
     * 
     * @param edgeId - ID of the starting edge
     * @param color - Optional color (cycles through defaults if omitted)
     * @param carriageCount - Cars for a train with no model, locomotive included (default: 1)
     * @param distance - Starting distance along the edge (default: 0)
     * @returns ID of the newly created train
     */
    spawnTrain: (edgeId, color, carriageCount, distance, stockId) => {
        const trainId = `train-${++trainCounter}`;
        const stock = getRollingStock(stockId);
        const trainColor = color || stock?.color || TRAIN_COLORS[trainCounter % TRAIN_COLORS.length];
        // Built to its model's scale, or the scale of the track it's put on
        const edge = useTrackStore.getState().edges[edgeId];
        const scale = stock?.scale ?? (edge && getPartById(edge.partId)?.scale) ?? 'n-scale';
        const size = sizeOf(scale);
        // The model's own cars, or free build's generic diesel and coaches
        const carLengths = stock?.carLengths ?? genericCarLengths(carriageCount ?? 1, scale);

        const train: Train = {
            id: trainId,
            currentEdgeId: edgeId,
            distanceAlongEdge: distance ?? 0,
            direction: 1,
            // Sets off at cruising speed, so a layout runs the moment it loads
            speed: DRIVING.DEFAULT_THROTTLE * size,
            throttle: DRIVING.DEFAULT_THROTTLE * size,
            color: trainColor,
            carriageCount: carLengths.length,
            carLengths: [...carLengths],
            scale,
            ...(stock && { stockId: stock.id }),
        };

        set((state) => {
            state.trains[trainId] = train;
        });

        return trainId;
    },

    /**
     * Take a train off the track (a wreck, with its debris). In collection
     * mode it goes back on the shelf, to run again.
     *
     * @param trainId - ID of the train to remove
     */
    removeTrain: (trainId) => {
        set((state) => {
            delete state.trains[trainId];
            sweepDebris(state, trainId);
        });
    },

    /**
     * Put a wreck back on the rails, repaired (the bill came with the crash):
     * standing at the clearest spot where it fits, its debris swept up.
     * False if it isn't a wreck, or there's nowhere it fits.
     */
    rerailTrain: (trainId) => {
        const { trains } = get();
        const wreck = trains[trainId];
        if (!wreck?.crashed) return false;
        const { edges, nodes } = useTrackStore.getState();
        const placed = rerail(wreck, trains, edges, nodes);
        if (!placed) return false;
        set((state) => {
            state.trains[trainId] = placed;
            sweepDebris(state, trainId);
        });
        return true;
    },

    /**
     * Update a train's physics state.
     * Used by the game loop to move trains.
     * 
     * @param trainId - ID of the train
     * @param distance - New distance along current edge
     * @param edgeId - New edge ID (if transitioned)
     * @param direction - New direction (if reversed)
     * @param bounceTime - Bounce animation timestamp (if bounced)
     */
    updateTrainPosition: (trainId, distance, edgeId, direction, bounceTime) => {
        set((state) => {
            const train = state.trains[trainId];
            if (!train) return;

            train.distanceAlongEdge = distance;
            if (edgeId) train.currentEdgeId = edgeId;
            if (direction) train.direction = direction;
            if (bounceTime !== undefined) train.bounceTime = bounceTime;
        });
    },

    /**
     * Player stop/go control: an emergency stop. A stopped train stands where
     * it is (and can still be hit); on Go it pulls away from a standstill.
     */
    setTrainStopped: (trainId, stopped) => {
        set((state) => {
            const train = state.trains[trainId];
            if (!train || train.crashed) return;
            train.stopped = stopped;
            if (stopped) train.speed = 0;
        });
    },

    /** Set a train's throttle: the speed it accelerates or brakes toward (mm/s). */
    setTrainThrottle: (trainId, throttle) => {
        set((state) => {
            const train = state.trains[trainId];
            if (train && !train.crashed) {
                train.throttle = Math.max(0, Math.min(topSpeedOf(train), throttle));
            }
        });
    },

    /**
     * The direction lever. A standing train reverses at once; a moving one
     * brakes to a stop first, then sets off the other way.
     */
    reverseTrain: (trainId) => {
        set((state) => {
            const train = state.trains[trainId];
            if (!train || train.crashed) return;
            if (train.speed > 0 && !train.stopped) {
                train.reverseRequested = !train.reverseRequested;
                return;
            }
            // Standing: turn back at once, the cars staying where they are
            const { edges, nodes } = useTrackStore.getState();
            state.trains[trainId] = reverseConsist({ ...train }, edges, nodes);
        });
    },

    /**
     * Mark a train as crashed.
     * stops movement and triggers crash physics.
     * 
     * @param trainId - ID of the crashed train
     */
    setCrashed: (trainId) => {
        set((state) => {
            const train = state.trains[trainId];
            if (!train) return;

            train.crashed = true;
            train.crashTime = performance.now();
            train.speed = 0;
        });
    },

    /**
     * Remove all trains from the simulation, wrecks and debris too.
     */
    clearTrains: () => set((state) => {
        state.trains = {};
        state.crashedParts = [];
        state.nearPairs = [];
    }),
});
