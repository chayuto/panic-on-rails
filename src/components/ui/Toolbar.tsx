import { useCallback, useRef } from 'react';
import { useTrackStore } from '../../stores/useTrackStore';
import { useSimulationStore } from '../../stores/useSimulationStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { exportLayout, importLayout } from '../../utils/fileManager';

export function Toolbar() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { getLayout, loadLayout, clearLayout, addTrack, edges } = useTrackStore();
    const { isRunning, toggleRunning, spawnTrain, clearTrains } = useSimulationStore();
    const { setMode, toggleGrid, showGrid, resetView, selectedEdgeId } = useEditorStore();

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
        clearLayout();
        clearTrains();
    }, [edges, clearLayout, clearTrains]);

    // Demo: Add a track at center
    const handleAddTrack = useCallback(() => {
        addTrack('kato-20-000', { x: 400, y: 300 }, 0);
    }, [addTrack]);

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
        setMode(isRunning ? 'edit' : 'simulate');
    }, [isRunning, edges, spawnTrain, toggleRunning, setMode]);

    return (
        <header className="toolbar">
            <div className="toolbar-title">
                <span>🚂</span>
                <span>PanicOnRails</span>
            </div>

            <div className="toolbar-actions">
                {/* File operations */}
                <button onClick={handleNew} title="New Layout">
                    📄 New
                </button>
                <button onClick={handleSave} title="Save to File">
                    💾 Save
                </button>
                <button onClick={handleLoad} title="Load from File">
                    📂 Load
                </button>

                <div className="toolbar-divider" />

                {/* Editor tools */}
                <button onClick={handleAddTrack} title="Add Demo Track">
                    ➕ Add Track
                </button>
                <button onClick={toggleGrid} title="Toggle Grid">
                    {showGrid ? '🔲' : '⬜'} Grid
                </button>
                <button onClick={resetView} title="Reset View">
                    🎯 Reset
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
