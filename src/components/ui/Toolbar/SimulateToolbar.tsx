/**
 * SimulateToolbar - Simulation control buttons
 * 
 * Displays when running the simulation:
 * - Play/Pause toggle
 * - Add Train button
 */

import { useCallback } from 'react';
import { useSimulationStore } from '../../../stores/useSimulationStore';
import { useTrackStore } from '../../../stores/useTrackStore';
import { useModeStore } from '../../../stores/useModeStore';

export function SimulateToolbar() {
    const { isRunning, toggleRunning, spawnTrain } = useSimulationStore();
    const { edges } = useTrackStore();
    const { enterEditMode, enterSimulateMode } = useModeStore();

    const handlePlayPause = useCallback(() => {
        if (!isRunning && Object.keys(edges).length > 0) {
            // Spawn a train on the first edge if none exist
            const firstEdgeId = Object.keys(edges)[0];
            if (firstEdgeId) {
                spawnTrain(firstEdgeId);
            }
        }
        toggleRunning();
        // Switch mode based on new running state
        if (isRunning) {
            enterEditMode();
        } else {
            enterSimulateMode();
        }
    }, [isRunning, edges, spawnTrain, toggleRunning, enterEditMode, enterSimulateMode]);

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
                title={isRunning ? 'Pause (M)' : 'Play (M)'}
            >
                {isRunning ? '⏸️' : '▶️'}
            </button>
            <button
                onClick={handleAddTrain}
                disabled={!hasEdges}
                title="Add Train"
                className="toolbar-btn-icon"
            >
                🚂
            </button>
        </>
    );
}
