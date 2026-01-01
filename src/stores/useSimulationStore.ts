import { create } from 'zustand';
import type { TrainId, EdgeId, Train } from '../types';

interface SimulationState {
    trains: Record<TrainId, Train>;
    isRunning: boolean;
    speedMultiplier: number;
}

interface SimulationActions {
    spawnTrain: (edgeId: EdgeId, color?: string) => TrainId;
    removeTrain: (trainId: TrainId) => void;
    updateTrainPosition: (trainId: TrainId, distance: number, edgeId?: EdgeId, direction?: 1 | -1) => void;
    setRunning: (running: boolean) => void;
    toggleRunning: () => void;
    setSpeedMultiplier: (multiplier: number) => void;
    clearTrains: () => void;
}

const TRAIN_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];

let trainCounter = 0;

export const useSimulationStore = create<SimulationState & SimulationActions>()((set, get) => ({
    trains: {},
    isRunning: false,
    speedMultiplier: 1.0,

    spawnTrain: (edgeId, color) => {
        const trainId = `train-${++trainCounter}`;
        const trainColor = color || TRAIN_COLORS[trainCounter % TRAIN_COLORS.length];

        const train: Train = {
            id: trainId,
            currentEdgeId: edgeId,
            distanceAlongEdge: 0,
            direction: 1,
            speed: 100, // pixels per second
            color: trainColor,
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

    updateTrainPosition: (trainId, distance, edgeId, direction) => {
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
                    },
                },
            };
        });
    },

    setRunning: (running) => set({ isRunning: running }),

    toggleRunning: () => set((state) => ({ isRunning: !state.isRunning })),

    setSpeedMultiplier: (multiplier) => set({ speedMultiplier: multiplier }),

    clearTrains: () => set({ trains: {} }),
}));
