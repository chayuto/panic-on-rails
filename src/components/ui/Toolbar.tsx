import { useCallback, useEffect, useRef, useState } from 'react';
import { useTrackStore } from '../../stores/useTrackStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { useModeStore } from '../../stores/useModeStore';
import { exportLayout, importLayout } from '../../utils/fileManager';
import { isMuted, toggleMute } from '../../utils/audioManager';
import { BudgetTicker } from './BudgetTicker';
import { getTemplateList, loadTemplate, applyTemplate } from '../../data/templates';
import type { TemplateMetadata } from '../../data/templates';

/**
 * Mute toggle button component
 */
function MuteToggle() {
    const [muted, setMuted] = useState(isMuted());

    const handleToggle = useCallback(() => {
        const newMuted = toggleMute();
        setMuted(newMuted);
    }, []);

    return (
        <button onClick={handleToggle} title={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
        </button>
    );
}

export function Toolbar() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { getLayout, loadLayout, clearLayout, edges } = useTrackStore();
    const { isRunning, toggleRunning, spawnTrain, clearTrains, setRunning } = useSimulationStore();
    const { toggleGrid, showGrid, resetView, selectedEdgeId } = useEditorStore();
    const { editSubMode, setEditSubMode, enterEditMode, enterSimulateMode } = useModeStore();

    // Template state
    const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
    const [loadingTemplate, setLoadingTemplate] = useState(false);

    // Load templates on mount
    useEffect(() => {
        getTemplateList().then(setTemplates);
    }, []);

    // Template loading handler
    const handleLoadTemplate = useCallback(async (templateId: string) => {
        if (!templateId) return;

        if (Object.keys(edges).length > 0) {
            if (!confirm('Load template? This will clear your current layout.')) {
                return;
            }
        }

        setLoadingTemplate(true);
        try {
            // Clear persisted stores first
            localStorage.removeItem('panic-on-rails-track-v1');
            localStorage.removeItem('panic-on-rails-simulation-v1');
            localStorage.removeItem('panic-on-rails-logic-v1');

            const template = await loadTemplate(templateId);
            applyTemplate(
                template,
                clearLayout,
                loadLayout as (data: unknown) => void,
                spawnTrain,
                () => setRunning(true),
                true // autoStart
            );
        } catch (error) {
            console.error('Failed to load template:', error);
            alert('Failed to load template');
        } finally {
            setLoadingTemplate(false);
        }
    }, [edges, clearLayout, loadLayout, spawnTrain, setRunning]);

    // File operations
    const handleSave = useCallback(() => {
        const layout = getLayout();
        exportLayout(layout, `panic-on-rails-${Date.now()}.json`);
    }, [getLayout]);

    const handleLoad = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const layout = await importLayout(file);
            loadLayout(layout);
        } catch (err) {
            console.error('Failed to load layout:', err);
            alert('Failed to load layout. Please check the file format.');
        }

        // Reset input
        e.target.value = '';
    }, [loadLayout]);

    const handleNew = useCallback(() => {
        if (Object.keys(edges).length > 0) {
            if (!confirm('Clear current layout?')) return;
        }
        // Clear persisted stores from localStorage
        localStorage.removeItem('panic-on-rails-track-v1');
        localStorage.removeItem('panic-on-rails-simulation-v1');
        localStorage.removeItem('panic-on-rails-logic-v1');
        localStorage.removeItem('panic-on-rails-budget-v1');

        clearLayout();
        clearTrains();

        // Force refresh to reset all state
        window.location.reload();
    }, [edges, clearLayout, clearTrains]);

    // Simulation controls
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

    return (
        <header className="toolbar">
            <div className="toolbar-title">
                <span>🚂</span>
                <span>PanicOnRails</span>
            </div>

            <BudgetTicker />

            <div className="toolbar-actions">
                {/* File operations */}
                <button onClick={handleNew} title="New Layout">
                    📄 New
                </button>
                <select
                    value=""
                    onChange={(e) => handleLoadTemplate(e.target.value)}
                    disabled={loadingTemplate}
                    title="Load Template"
                    className="template-selector"
                >
                    <option value="">📋 Templates...</option>
                    {templates.map(t => (
                        <option key={t.id} value={t.id}>
                            {t.name} ({t.difficulty})
                        </option>
                    ))}
                </select>
                <button onClick={handleSave} title="Save to File">
                    💾 Save
                </button>
                <button onClick={handleLoad} title="Load from File">
                    📂 Load
                </button>

                <div className="toolbar-divider" />

                {/* Editor tools */}

                <button onClick={toggleGrid} title="Toggle Grid">
                    {showGrid ? '🔲' : '⬜'} Grid
                </button>
                <button onClick={resetView} title="Reset View">
                    🎯 Reset
                </button>
                <MuteToggle />

                <div className="toolbar-divider" />

                {/* Logic tools */}
                <button
                    onClick={() => setEditSubMode('sensor')}
                    className={editSubMode === 'sensor' ? 'active' : ''}
                    title="Sensor Tool - Place sensors on tracks"
                >
                    📡 Sensor
                </button>
                <button
                    onClick={() => setEditSubMode('signal')}
                    className={editSubMode === 'signal' ? 'active' : ''}
                    title="Signal Tool - Place signals at nodes"
                >
                    🚦 Signal
                </button>
                <button
                    onClick={() => setEditSubMode('wire')}
                    className={editSubMode === 'wire' ? 'active' : ''}
                    title="Wire Tool - Connect sensors to switches/signals"
                >
                    🔌 Wire
                </button>
                <button
                    onClick={() => setEditSubMode('delete')}
                    className={editSubMode === 'delete' ? 'active' : ''}
                    title="Delete Tool - Click tracks to remove them"
                >
                    🗑️ Delete
                </button>
                <button
                    onClick={() => setEditSubMode('select')}
                    className={editSubMode === 'select' ? 'active' : ''}
                    title="Edit Mode - Normal track editing"
                >
                    ✏️ Edit
                </button>

                <div className="toolbar-divider" />

                {/* Simulation */}
                <button
                    onClick={handlePlayPause}
                    className={isRunning ? 'active' : ''}
                    title={isRunning ? 'Pause' : 'Play'}
                >
                    {isRunning ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button
                    onClick={() => {
                        const firstEdgeId = Object.keys(edges)[0];
                        if (firstEdgeId) spawnTrain(firstEdgeId);
                    }}
                    disabled={Object.keys(edges).length === 0}
                    title="Add Train"
                >
                    🚂 Train
                </button>

                {selectedEdgeId && (
                    <span className="toolbar-info">Selected: {selectedEdgeId.slice(0, 8)}...</span>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden-input"
                onChange={handleFileChange}
            />
        </header>
    );
}
