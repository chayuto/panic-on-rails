/**
 * Train Management Slice
 */

import type { Train } from '../../../types';
import type { SimulationSliceCreator, TrainSlice } from './types';

const TRAIN_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];
let trainCounter = 0;
const DEFAULT_CARRIAGE_SPACING = 30;

export const createTrainSlice: SimulationSliceCreator<TrainSlice> = (set) => ({
    /**
     * Spawn a new train on a specific edge.
     * 
     * @param edgeId - ID of the starting edge
     * @param color - Optional color (cycles through defaults if omitted)
     * @param carriageCount - Number of carriages (default: 1)
     * @returns ID of the newly created train
     */
    spawnTrain: (edgeId, color, carriageCount) => {
        const trainId = `train-${++trainCounter}`;
        const trainColor = color || TRAIN_COLORS[trainCounter % TRAIN_COLORS.length];

        const train: Train = {
            id: trainId,
            currentEdgeId: edgeId,
            distanceAlongEdge: 0,
            direction: 1,
            speed: 100, // pixels per second
            color: trainColor,
            carriageCount: carriageCount ?? 1,
            carriageSpacing: DEFAULT_CARRIAGE_SPACING,
        };

        set((state) => ({
            trains: { ...state.trains, [trainId]: train },
        }));

        return trainId;
    },

    /**
     * Remove a train from the simulation.
     * 
     * @param trainId - ID of the train to remove
     */
    removeTrain: (trainId) => {
        set((state) => {
            const newTrains = { ...state.trains };
            delete newTrains[trainId];
            return { trains: newTrains };
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
            if (!train) return state;

            return {
                trains: {
                    ...state.trains,
                    [trainId]: {
                        ...train,
                        distanceAlongEdge: distance,
                        ...(edgeId && { currentEdgeId: edgeId }),
                        ...(direction && { direction }),
                        ...(bounceTime !== undefined && { bounceTime }),
                    },
                },
            };
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
            if (!train) return state;

            return {
                trains: {
                    ...state.trains,
                    [trainId]: {
                        ...train,
                        crashed: true,
                        crashTime: performance.now(),
                        speed: 0, // Stop the train
                    },
                },
            };
        });
    },

    /**
     * Remove all trains from the simulation.
     */
    clearTrains: () => set({ trains: {} }),
});
