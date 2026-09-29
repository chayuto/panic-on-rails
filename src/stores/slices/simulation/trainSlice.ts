/**
 * Train Management Slice
 */

import type { Train } from '../../../types';
import type { SimulationSliceCreator, TrainSlice } from './types';
import { CAR_PITCH } from '../../../config/rollingStock';
import { DRIVING } from '../../../simulation/driving';
import { getRollingStock } from '../../../data/rollingStock';

const TRAIN_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];
let trainCounter = 0;

export const createTrainSlice: SimulationSliceCreator<TrainSlice> = (set) => ({
    /**
     * Spawn a new train on a specific edge.
     * 
     * @param edgeId - ID of the starting edge
     * @param color - Optional color (cycles through defaults if omitted)
     * @param carriageCount - Number of carriages (default: 1)
     * @param distance - Starting distance along the edge (default: 0)
     * @returns ID of the newly created train
     */
    spawnTrain: (edgeId, color, carriageCount, distance, stockId) => {
        const trainId = `train-${++trainCounter}`;
        const stock = getRollingStock(stockId);
        const trainColor = color || stock?.color || TRAIN_COLORS[trainCounter % TRAIN_COLORS.length];

        const train: Train = {
            id: trainId,
            currentEdgeId: edgeId,
            distanceAlongEdge: distance ?? 0,
            direction: 1,
            // Sets off at cruising speed, so a layout runs the moment it loads
            speed: DRIVING.DEFAULT_THROTTLE,
            throttle: DRIVING.DEFAULT_THROTTLE,
            color: trainColor,
            carriageCount: carriageCount ?? stock?.cars ?? 1,
            carriageSpacing: CAR_PITCH,
            ...(stock && { stockId: stock.id }),
        };

        set((state) => {
            state.trains[trainId] = train;
        });

        return trainId;
    },

    /**
     * Remove a train from the simulation.
     * 
     * @param trainId - ID of the train to remove
     */
    removeTrain: (trainId) => {
        set((state) => {
            delete state.trains[trainId];
        });
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
                const top = getRollingStock(train.stockId)?.topSpeed ?? DRIVING.MAX_THROTTLE;
                train.throttle = Math.max(0, Math.min(top, throttle));
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
            train.direction = train.direction === 1 ? -1 : 1;
            train.heldAtSignal = false;
            train.reverseRequested = false;
            // The route behind the train is now ahead of it
            train.trail = [];
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
     * Remove all trains from the simulation.
     */
    clearTrains: () => set((state) => {
        state.trains = {};
    }),
});
