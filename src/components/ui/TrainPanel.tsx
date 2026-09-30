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
 * - Operating sessions: a timed shift, tallied, with a bonus if it's clean
 */

import { useCallback, useState } from 'react';
import { TrainFront, Play, Pause, Plus, Trash2, Zap, AlertTriangle, X, Hand, Repeat, OctagonX, Wrench, Landmark } from 'lucide-react';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useTrackStore } from '../../stores/useTrackStore';
import { useLogicStore } from '../../stores/useLogicStore';
import { addTrain, beginSession, endSessionEarly, rerailWrecks, togglePlayPause } from '../../simulation/controls';
import { SESSION, type SessionResult } from '../../simulation/session';
import { nextDeparture } from '../../simulation/stations';
import { STATIONS } from '../../config/stations';
import { formatClock } from '../../utils/railwayClock';
import { scaleKmh, throttleOf } from '../../simulation/driving';
import { SCALES } from '../../config/scales';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { useShopStore } from '../../stores/useShopStore';
import { getRollingStock, ROLLING_STOCK, topSpeedOf } from '../../data/rollingStock';
import { trainsLeft } from '../../data/collection';
import type { Station, StationId, Train } from '../../types';
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
    const notice = useSimulationStore(s => s.notice);
    const setNotice = useSimulationStore(s => s.setNotice);
    const hasEdges = useTrackStore(s => Object.keys(s.edges).length > 0);
    const stations = useLogicStore(s => s.stations);

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

    // Every train you own is running: time to buy another. No room: the notice says so
    const handleSpawnTrain = useCallback(() => {
        if (addTrain(carriageCount) === 'no-train') openShop('trains');
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

            {notice && (
                <div className="train-notice" role="status" data-testid="train-notice">
                    <p>{notice}</p>
                    <button onClick={() => setNotice(null)} aria-label="Dismiss" title="Dismiss">
                        <X size={12} />
                    </button>
                </div>
            )}

            <SessionBox canRun={hasEdges} paid={inCollection} />

            <TimetableBox />

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
                                onClick={() => addTrain(undefined, stock.id)}
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
                            <span className="train-status" title={trainStatus(train, isRunning, stations, simElapsed)} data-testid={`train-status-${train.id}`}>
                                {train.crashed ? <Zap size={14} />
                                    : train.dwell !== undefined ? <Landmark size={14} />
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

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The operating session: start one, watch it tick down with its tally, and
 * see how it went. A full session without a wreck earns a bonus.
 */
function SessionBox({ canRun, paid }: { canRun: boolean; paid: boolean }) {
    const session = useSimulationStore(s => s.session);
    const result = useSimulationStore(s => s.sessionResult);
    const simElapsed = useSimulationStore(s => s.simElapsed);
    const setSessionResult = useSimulationStore(s => s.setSessionResult);

    if (session) {
        return (
            <div className="session-box" data-testid="session">
                <div className="session-line">
                    <span><strong>Session</strong> · {formatClock(session.endsAt - simElapsed)} left</span>
                    <button onClick={endSessionEarly} data-testid="session-end">End</button>
                </div>
                <div className="session-tally" data-testid="session-tally">
                    {money(session.income)} taken · {plural(session.calls, 'call')} · {plural(session.wrecks, 'wreck')}
                    {session.due > 0 && ` · ${session.ran} of ${plural(session.due, 'departure')} ran`}
                </div>
            </div>
        );
    }

    if (result) {
        const bonus = bonusLine(result, paid);
        return (
            <div className="session-box" role="status" data-testid="session-result">
                <div className="session-line">
                    <strong>{result.endedEarly ? 'Session ended' : 'Session over'}</strong>
                    <button className="session-dismiss" onClick={() => setSessionResult(null)} aria-label="Dismiss">
                        <X size={12} />
                    </button>
                </div>
                <div className="session-tally">
                    {money(result.income)} taken · {plural(result.calls, 'call')} · {plural(result.wrecks, 'wreck')}
                    {result.due > 0 && ` · ${result.ran} of ${plural(result.due, 'departure')} ran`}
                </div>
                <div className={`session-bonus ${result.bonus > 0 ? 'earned' : ''}`} data-testid="session-bonus">{bonus}</div>
                <button className="session-start" onClick={beginSession} disabled={!canRun} data-testid="session-start">
                    Start another
                </button>
            </div>
        );
    }

    return (
        <button
            className="session-start"
            onClick={beginSession}
            disabled={!canRun}
            title={`${SESSION.MINUTES} minutes of railway time, tallied. Get through without a wreck for a ${SESSION.CLEAN_BONUS * 100}% bonus, and keep to the stations' timetables for another ${SESSION.PUNCTUAL_BONUS * 100}%.`}
            data-testid="session-start"
        >
            Start a {SESSION.MINUTES}-minute session
        </button>
    );
}

/** What a session's bonuses came to, and what cost the ones it missed. */
function bonusLine(result: SessionResult, paid: boolean): string {
    if (result.endedEarly) return 'Ended early: no bonus';
    const late = result.due > 0 && !result.punctual ? `${result.ran} of ${plural(result.due, 'departure')} ran` : null;
    if (!result.clean && !result.punctual) return late ? `A wreck, and ${late}: no bonus` : 'A wreck: no bonus';
    const earned = result.clean && result.punctual ? 'Crash-free and on time' : result.clean ? 'Crash-free' : 'On time';
    const line = `${earned}: ${money(result.bonus)} bonus${paid ? '' : ' (paid in collection mode)'}`;
    if (!result.clean) return `${line} · a wreck: no crash-free bonus`;
    return late ? `${line} · ${late}, too few for the timetable bonus` : line;
}

/**
 * Each station's clock-face timetable: how often a departure is due, and
 * when the next one is. A passenger train calling there waits for it.
 */
function TimetableBox() {
    const stations = useLogicStore(s => s.stations);
    const setStationInterval = useLogicStore(s => s.setStationInterval);
    // Whole railway seconds: the clock needs no finer
    const now = useSimulationStore(s => Math.floor(s.simElapsed));
    const list = Object.values(stations).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (list.length === 0) return null;
    return (
        <div className="timetable-box" data-testid="timetable">
            <div className="session-line">
                <strong>Timetable</strong>
                <span className="timetable-clock" title="Railway time" data-testid="railway-clock">{formatClock(now)}</span>
            </div>
            {list.map(station => {
                const next = nextDeparture(station, now);
                return (
                    <div className="timetable-row" key={station.id}>
                        <span className="timetable-station">{station.name}</span>
                        <select
                            value={station.interval ?? 0}
                            onChange={e => setStationInterval(station.id, Number(e.target.value) || undefined)}
                            aria-label={`${station.name} timetable`}
                            data-testid={`timetable-${station.name}`}
                        >
                            <option value={0}>No timetable</option>
                            {STATIONS.INTERVALS.map(interval => (
                                <option key={interval} value={interval}>Every {formatClock(interval)}</option>
                            ))}
                        </select>
                        {next !== undefined && (
                            <span className="timetable-next" data-testid={`timetable-next-${station.name}`}>next {formatClock(next)}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function trainStatus(train: Train, isRunning: boolean, stations: Record<StationId, Station>, simElapsed: number): string {
    if (train.crashed) return 'Wrecked: blocking the line';
    if (train.dwell !== undefined) {
        const station = stations[train.calledAt ?? ''];
        const at = `At ${station?.name ?? 'a station'}`;
        return station?.interval ? `${at}, for the ${formatClock(simElapsed + train.dwell)} departure` : at;
    }
    if (train.heldAtSignal) return 'Waiting at red signal';
    if (train.stopped) return 'Stopped';
    return isRunning ? 'Running' : 'Paused';
}
