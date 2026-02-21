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
        <button onClick={handleToggle} title={muted ? 'Unmute' : 'Mute'} className="toolbar-btn-icon" data-testid="view-mute-toggle">
            {muted ? '🔇' : '🔊'}
        </button>
    );
}

export function ViewActions() {
    const { toggleGrid, showGrid } = useEditorStore();

    return (
        <>
            <button onClick={toggleGrid} title="Toggle Grid" className="toolbar-btn-icon" data-testid="view-grid-toggle">
                {showGrid ? '🔲' : '⬜'}
            </button>
            <MuteToggle />
        </>
    );
}
