import { create } from 'zustand';
import type { TrainId, EdgeId, Train } from '../types';

interface SimulationState {
    trains: Record<TrainId, Train>;
    isRunning: boolean;
    speedMultiplier: number;
}

/** Default spacing between carriage centers in pixels */
export const DEFAULT_CARRIAGE_SPACING = 30;

interface SimulationActions {
    spawnTrain: (edgeId: EdgeId, color?: string, carriageCount?: number) => TrainId;
    removeTrain: (trainId: TrainId) => void;
    updateTrainPosition: (trainId: TrainId, distance: number, edgeId?: EdgeId, direction?: 1 | -1, bounceTime?: number) => void;
    setCrashed: (trainId: TrainId) => void;
    setRunning: (running: boolean) => void;
    toggleRunning: () => void;
    setSpeedMultiplier: (multiplier: number) => void;
    clearTrains: () => void;
}

const TRAIN_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];

let trainCounter = 0;

export const useSimulationStore = create<SimulationState & SimulationActions>()((set) => ({
    trains: {},
    isRunning: false,
    speedMultiplier: 1.0,

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

    removeTrain: (trainId) => {
        set((state) => {
            const newTrains = { ...state.trains };
            delete newTrains[trainId];
            return { trains: newTrains };
        });
    },

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

    setRunning: (running) => set({ isRunning: running }),

    toggleRunning: () => set((state) => ({ isRunning: !state.isRunning })),

    setSpeedMultiplier: (multiplier) => set({ speedMultiplier: multiplier }),

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

    clearTrains: () => set({ trains: {} }),
}));
