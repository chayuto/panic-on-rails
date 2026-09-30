/**
 * SimulateToolbar - Simulation control buttons
 *
 * Displays when running the simulation:
 * - Play/Pause toggle (pausing stays in Simulate mode so trains stay visible)
 * - Add Train button (spawns away from existing trains)
 */

import { useCallback } from 'react';
import { Play, Pause, TrainFront } from 'lucide-react';
import { useSimulationStore } from '../../../stores/useSimulationStore';
import { useTrackStore } from '../../../stores/useTrackStore';
import { addTrain, togglePlayPause } from '../../../simulation/controls';
import { useShopStore } from '../../../stores/useShopStore';

export function SimulateToolbar() {
    const isRunning = useSimulationStore(s => s.isRunning);
    const hasEdges = useTrackStore(s => Object.keys(s.edges).length > 0);
    // Every train you own is already running: time to buy another. No room: the train panel says so
    const handleAddTrain = useCallback(() => {
        if (addTrain() === 'no-train') useShopStore.getState().openShop('trains');
    }, []);

    return (
        <>
            <button
                onClick={togglePlayPause}
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
