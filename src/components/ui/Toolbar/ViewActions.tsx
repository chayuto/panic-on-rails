/**
 * ViewActions - View control buttons for the toolbar
 * 
 * Handles:
 * - Grid toggle
 * - Reset view (zoom/pan)
 * - Mute toggle (audio)
 */

import { useCallback, useState } from 'react';
import { useEditorStore } from '../../../stores/useEditorStore';
import { isMuted, toggleMute } from '../../../utils/audioManager';

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

export function ViewActions() {
    const { toggleGrid, showGrid, toggleMeasurements, showMeasurements, resetView } = useEditorStore();

    return (
        <>
            <button onClick={toggleGrid} title="Toggle Grid">
                {showGrid ? '🔲' : '⬜'} Grid
            </button>
            <button onClick={toggleMeasurements} title="Toggle Measurements (m)">
                {showMeasurements ? '📐' : '📏'} Measure
            </button>
            <button onClick={resetView} title="Reset View">
                🎯 Reset
            </button>
            <MuteToggle />
        </>
    );
}
