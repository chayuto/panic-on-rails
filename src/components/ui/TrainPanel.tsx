/**
 * TrainPanel - Train management panel for Simulate mode
 * 
 * Features:
 * - List of active trains with status and carriage count
 * - Add/Remove train controls with carriage selector
 * - Per-train throttle (with momentum), scale speed, Stop/Go and the direction lever
 * - Play/Pause simulation
 * - Speed multiplier slider
 * - Wrecks: they block the line until re-railed or taken off the track
 * - The dispatcher's record: trains wrecked, and time since the last
 */

import { useCallback, useState } from 'react';
import { TrainFront, Play, Pause, Plus, Trash2, Zap, AlertTriangle, X, Hand, Repeat, OctagonX, Wrench } from 'lucide-react';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { rerailWrecks, spawnTrainAtClearestSpot, togglePlayPause } from '../../simulation/controls';
import { scaleKmh, throttleOf } from '../../simulation/driving';
import { SCALES } from '../../config/scales';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useShopStore } from '../../stores/useShopStore';
import { getRollingStock, ROLLING_STOCK, topSpeedOf } from '../../data/rollingStock';
import { trainsLeft } from '../../data/collection';
import type { Train } from '../../types';
import './TrainPanel.css';

export function TrainPanel() {
    const trains = useSimulationStore(s => s.trains);
    const isRunning = useSimulationStore(s => s.isRunning);
    const speedMultiplier = useSimulationStore(s => s.speedMultiplier);
    const removeTrain = useSimulationStore(s => s.removeTrain);
    const setSpeedMultiplier = useSimulationStore(s => s.setSpeedMultiplier);
    const setTrainStopped = useSimulationStore(s => s.setTrainStopped);
    const reverseTrain = useSimulationStore(s => s.reverseTrain);
    const setTrainThrottle = useSimulationStore(s => s.setTrainThrottle);
    const clearTrains = useSimulationStore(s => s.clearTrains);
    const rerailTrain = useSimulationStore(s => s.rerailTrain);
    const sessionWrecks = useSimulationStore(s => s.wrecks);
    const lastWreckAt = useSimulationStore(s => s.lastWreckAt);
    const simElapsed = useSimulationStore(s => s.simElapsed);
    const hasEdges = useTrackStore(s => Object.keys(s.edges).length > 0);

    const mode = useCollectionStore(s => s.mode);
    const ownedTrains = useCollectionStore(s => s.ownedTrains);
    const openShop = useShopStore(s => s.openShop);
    const inCollection = mode === 'collection';

    // State for carriage count selector (free build)
    const [carriageCount, setCarriageCount] = useState(1);
    // Wrecks a re-rail found nowhere clear to put
    const [stuck, setStuck] = useState<string[]>([]);

    const trainList = Object.values(trains);
    const wrecksOnTrack = trainList.filter(t => t.crashed).length;
    const noRoom = stuck.some(id => trains[id]?.crashed);
    const left = trainsLeft(ownedTrains, trains);
    const anyLeft = !inCollection || Object.values(left).some(n => n > 0);

    const handleSpawnTrain = useCallback(() => {
        if (!spawnTrainAtClearestSpot(carriageCount)) openShop('trains');
    }, [carriageCount, openShop]);

    const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSpeedMultiplier(parseFloat(e.target.value));
    }, [setSpeedMultiplier]);

    const handleCarriageCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCarriageCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)));
    }, []);

    const handleRerail = useCallback((trainId: string) => setStuck(rerailTrain(trainId) ? [] : [trainId]), [rerailTrain]);
    const handleRerailAll = useCallback(() => setStuck(rerailWrecks()), []);

    return (
        <div className="train-panel" data-testid="train-panel">
            <div className="train-panel-header">
                <h2><TrainFront size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />Trains</h2>
                <span className="train-count">{trainList.length}</span>
            </div>

            {/* The dispatcher's record, in railway time */}
            {(simElapsed > 0 || sessionWrecks > 0) && (
                <div className="wreck-record" data-testid="wreck-record" title="Trains wrecked this session, and railway time since the last wreck">
                    Crash-free for {formatClock(simElapsed - (lastWreckAt ?? 0))}
                    {sessionWrecks > 0 && ` · ${sessionWrecks} ${sessionWrecks === 1 ? 'train' : 'trains'} wrecked`}
                </div>
            )}

            {/* Controls */}
            <div className="train-controls">
                <button
                    className={`control-btn play-btn ${isRunning ? 'active' : ''}`}
                    onClick={togglePlayPause}
                    disabled={!hasEdges}
                    title={isRunning ? 'Pause (Space)' : 'Play (Space)'}
                    data-testid="train-play-btn"
                >
                    {isRunning ? <Pause size={14} /> : <Play size={14} />}
                </button>

                <button
                    className="control-btn add-train-btn"
                    onClick={handleSpawnTrain}
                    disabled={!hasEdges}
                    title={anyLeft ? 'Add Train' : 'All your trains are running: buy another'}
                    data-testid="train-add-btn"
                >
                    <Plus size={14} /> Add Train
                </button>

                <button
                    className="control-btn clear-btn"
                    onClick={clearTrains}
                    disabled={trainList.length === 0}
                    title="Clear All Trains"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {inCollection ? (
                /* Your trains: run one you own */
                <div className="owned-trains" data-testid="owned-trains">
                    {ROLLING_STOCK.filter(s => (ownedTrains[s.id] ?? 0) > 0).map(stock => (
                        <div className="owned-train" key={stock.id}>
                            <span className="train-color" style={{ backgroundColor: stock.color }} />
                            <span className="owned-train-name">{stock.name}</span>
                            <span className="owned-train-left" data-testid={`stock-left-${stock.id}`}>
                                {left[stock.id] ?? 0}/{ownedTrains[stock.id]}
                            </span>
                            <button
                                onClick={() => spawnTrainAtClearestSpot(undefined, undefined, stock.id)}
                                disabled={!hasEdges || (left[stock.id] ?? 0) === 0}
                                title="Put this train on the track"
                                data-testid={`run-stock-${stock.id}`}
                            >
                                Run
                            </button>
                        </div>
                    ))}
                    <button className="owned-trains-shop" onClick={() => openShop('trains')}>
                        Get more trains
                    </button>
                </div>
            ) : (
                /* Carriage Count Control */
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
            )}

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

            {/* Wrecks block the line until cleared */}
            {wrecksOnTrack > 0 && (
                <div className="crash-warning" role="status" data-testid="wreck-warning">
                    <p>
                        <AlertTriangle size={14} /> {wrecksOnTrack === 1 ? 'A wreck is' : `${wrecksOnTrack} wrecks are`} blocking
                        the line: a train that runs into one crashes too.
                    </p>
                    {noRoom && (
                        <p className="crash-warning-hint" data-testid="rerail-no-room">
                            There's no clear spot to re-rail it. Take a wreck off the track (×) to make room.
                        </p>
                    )}
                    <button className="crash-warning-action" onClick={handleRerailAll} data-testid="rerail-all">
                        <Wrench size={12} /> Re-rail {wrecksOnTrack === 1 ? 'it' : 'them all'}
                    </button>
                </div>
            )}

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
                            <span className="train-name" title={getRollingStock(train.stockId)?.name}>
                                {train.id.replace('train-', 'Train ')}
                                {(train.carriageCount ?? 1) > 1 && (
                                    <span className="carriage-info"> ({train.carriageCount} cars)</span>
                                )}
                            </span>
                            <span className="train-status" title={trainStatus(train, isRunning)}>
                                {train.crashed ? <Zap size={14} />
                                    : train.heldAtSignal ? <OctagonX size={14} />
                                        : train.stopped ? <Hand size={14} />
                                            : isRunning ? <TrainFront size={14} /> : <Pause size={14} />}
                            </span>
                            {!train.crashed && (
                                <>
                                    <button
                                        className={`train-action-btn ${train.stopped ? 'active' : ''}`}
                                        onClick={() => setTrainStopped(train.id, !train.stopped)}
                                        title={train.stopped ? 'Go' : 'Stop'}
                                        aria-pressed={!!train.stopped}
                                        data-testid={`train-stop-${train.id}`}
                                    >
                                        {train.stopped ? <Play size={12} /> : <Hand size={12} />}
                                    </button>
                                    <button
                                        className={`train-action-btn ${train.reverseRequested ? 'active' : ''}`}
                                        onClick={() => reverseTrain(train.id)}
                                        title={train.reverseRequested ? 'Reversing: stopping first' : 'Reverse'}
                                        aria-pressed={!!train.reverseRequested}
                                        data-testid={`train-reverse-${train.id}`}
                                    >
                                        <Repeat size={12} />
                                    </button>
                                </>
                            )}
                            {train.crashed && (
                                <button
                                    className="train-action-btn"
                                    onClick={() => handleRerail(train.id)}
                                    title="Re-rail: back on the track, repaired, at a clear spot"
                                    data-testid={`train-rerail-${train.id}`}
                                >
                                    <Wrench size={12} />
                                </button>
                            )}
                            <button
                                className="remove-btn"
                                onClick={() => removeTrain(train.id)}
                                title={train.crashed ? 'Take the wreck off the track' : 'Remove Train'}
                                data-testid={`train-remove-${train.id}`}
                            >
                                <X size={14} />
                            </button>
                            {!train.crashed && (
                                <label className="train-throttle" title="Throttle: the train speeds up or slows down to this with momentum">
                                    <input
                                        type="range"
                                        min={0}
                                        max={topSpeedOf(train)}
                                        step={5}
                                        value={throttleOf(train)}
                                        onChange={e => setTrainThrottle(train.id, Number(e.target.value))}
                                        aria-label={`${train.id.replace('train-', 'Train ')} throttle`}
                                        data-testid={`train-throttle-${train.id}`}
                                    />
                                    <span className="train-speed" data-testid={`train-speed-${train.id}`}>
                                        {Math.round(scaleKmh(train.speed, SCALES[train.scale ?? 'n-scale'].ratio))} km/h
                                    </span>
                                </label>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/** Railway time as m:ss, or h:mm:ss. */
function formatClock(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const pad = (n: number) => String(n).padStart(2, '0');
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

function trainStatus(train: Train, isRunning: boolean): string {
    if (train.crashed) return 'Wrecked: blocking the line';
    if (train.heldAtSignal) return 'Waiting at red signal';
    if (train.stopped) return 'Stopped';
    return isRunning ? 'Running' : 'Paused';
}
