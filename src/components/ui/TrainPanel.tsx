/**
 * TrainPanel - Train management panel for Simulate mode
 * 
 * Features:
 * - List of active trains with status and carriage count
 * - Add/Remove train controls with carriage selector
 * - Play/Pause simulation
 * - Speed multiplier slider
 * - Crash warnings
 */

import { useCallback, useState } from 'react';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import './TrainPanel.css';

export function TrainPanel() {
    const {
        trains,
        isRunning,
        speedMultiplier,
        spawnTrain,
        removeTrain,
        toggleRunning,
        setSpeedMultiplier,
        clearTrains
    } = useSimulationStore();
    const { edges } = useTrackStore();
    
    // State for carriage count selector
    const [carriageCount, setCarriageCount] = useState(1);

    const trainList = Object.values(trains);
    const hasEdges = Object.keys(edges).length > 0;

    const handleSpawnTrain = useCallback(() => {
        const edgeIds = Object.keys(edges);
        if (edgeIds.length > 0) {
            // Spawn on random edge for variety
            const randomEdge = edgeIds[Math.floor(Math.random() * edgeIds.length)];
            spawnTrain(randomEdge, undefined, carriageCount);
        }
    }, [edges, spawnTrain, carriageCount]);

    const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSpeedMultiplier(parseFloat(e.target.value));
    }, [setSpeedMultiplier]);

    const handleCarriageCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCarriageCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)));
    }, []);

    return (
        <div className="train-panel">
            <div className="train-panel-header">
                <h2>🚂 Trains</h2>
                <span className="train-count">{trainList.length}</span>
            </div>

            {/* Controls */}
            <div className="train-controls">
                <button
                    className={`control-btn play-btn ${isRunning ? 'active' : ''}`}
                    onClick={toggleRunning}
                    title={isRunning ? 'Pause' : 'Play'}
                >
                    {isRunning ? '⏸️' : '▶️'}
                </button>

                <button
                    className="control-btn add-train-btn"
                    onClick={handleSpawnTrain}
                    disabled={!hasEdges}
                    title="Add Train"
                >
                    ➕ Add Train
                </button>

                <button
                    className="control-btn clear-btn"
                    onClick={clearTrains}
                    disabled={trainList.length === 0}
                    title="Clear All Trains"
                >
                    🗑️
                </button>
            </div>

            {/* Carriage Count Control */}
            <div className="carriage-control">
                <label>
                    <span>Carriages: {carriageCount}</span>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={carriageCount}
                        onChange={handleCarriageCountChange}
                    />
                </label>
            </div>

            {/* Speed Control */}
            <div className="speed-control">
                <label>
                    <span>Speed: {speedMultiplier.toFixed(1)}x</span>
                    <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={speedMultiplier}
                        onChange={handleSpeedChange}
                    />
                </label>
            </div>

            {/* Train List */}
            <div className="train-list">
                {trainList.length === 0 ? (
                    <div className="empty-state">
                        <p>No trains yet</p>
                        <p className="hint">Click "Add Train" to spawn one</p>
                    </div>
                ) : (
                    trainList.map(train => (
                        <div
                            key={train.id}
                            className={`train-item ${train.crashed ? 'crashed' : ''}`}
                        >
                            <span
                                className="train-color"
                                style={{ backgroundColor: train.color }}
                            />
                            <span className="train-name">
                                {train.id.replace('train-', 'Train ')}
                                {(train.carriageCount ?? 1) > 1 && (
                                    <span className="carriage-info"> ({train.carriageCount} cars)</span>
                                )}
                            </span>
                            <span className="train-status">
                                {train.crashed ? '💥' : isRunning ? '🚂' : '⏸️'}
                            </span>
                            <button
                                className="remove-btn"
                                onClick={() => removeTrain(train.id)}
                                title="Remove Train"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Crash Warning */}
            {trainList.some(t => t.crashed) && (
                <div className="crash-warning">
                    ⚠️ Some trains have crashed!
                </div>
            )}
        </div>
    );
}
