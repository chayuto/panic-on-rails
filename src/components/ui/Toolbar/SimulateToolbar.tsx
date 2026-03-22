/**
 * SimulateToolbar - Simulation control buttons
 * 
 * Displays when running the simulation:
 * - Play/Pause toggle
 * - Add Train button
 */

import { useCallback } from 'react';
import { Play, Pause, TrainFront } from 'lucide-react';
import { useSimulationStore } from '../../../stores/useSimulationStore';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useModeStore } from '../../../stores/useModeStore';

export function SimulateToolbar() {
    const { isRunning, trains, toggleRunning, spawnTrain, clearTrains, clearDebris, clearError, clearLog } = useSimulationStore();
    const { edges } = useTrackStore();
    const { enterEditMode, enterSimulateMode } = useModeStore();

    const handlePlayPause = useCallback(() => {
        if (!isRunning && Object.keys(edges).length > 0) {
            // Clear crashed trains and wreckage before restarting
            const hasCrashedTrains = Object.values(trains).some(t => t.crashed);
            if (hasCrashedTrains) {
                clearTrains();
                clearDebris();
                clearError();
                clearLog();
            }

            // Spawn a train on the first edge if none exist
            const trainCount = Object.keys(trains).length;
            const remainingTrains = hasCrashedTrains ? 0 : trainCount;
            if (remainingTrains === 0) {
                const firstEdgeId = Object.keys(edges)[0];
                if (firstEdgeId) {
                    spawnTrain(firstEdgeId);
                }
            }
        }
        toggleRunning();
        // Switch mode based on new running state
        if (isRunning) {
            enterEditMode();
        } else {
            enterSimulateMode();
        }
    }, [isRunning, trains, edges, spawnTrain, clearTrains, clearDebris, clearError, clearLog, toggleRunning, enterEditMode, enterSimulateMode]);

    const handleAddTrain = useCallback(() => {
        const edgeIds = Object.keys(edges);
        if (edgeIds.length > 0) {
            // Spawn on first edge
            spawnTrain(edgeIds[0]);
        }
    }, [edges, spawnTrain]);

    const hasEdges = Object.keys(edges).length > 0;

    return (
        <>
            <button
                onClick={handlePlayPause}
                className={`toolbar-btn-icon ${isRunning ? 'active' : ''}`}
                title={isRunning ? 'Pause (Space)' : 'Play (Space)'}
                data-testid="sim-play-pause"
            >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
                onClick={handleAddTrain}
                disabled={!hasEdges}
                title="Add Train"
                className="toolbar-btn-icon"
                data-testid="sim-add-train"
            >
                <TrainFront size={16} />
            </button>
        </>
    );
}
