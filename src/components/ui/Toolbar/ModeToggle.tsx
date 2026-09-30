/**
 * ModeToggle - Prominent toggle between Edit and Simulate modes
 * 
 * Features:
 * - Two-button design for clear mode indication
 * - The M key toggles it too, through useKeyboardShortcuts (the only key handler for it)
 * - Visual distinction with colored backgrounds
 * - Subtle pulse animation in Simulate mode
 * - Accessibility: aria-pressed, focus states
 */

import { Wrench, TrainFront } from 'lucide-react';
import { useModeStore } from '../../../stores/useModeStore';
import './ModeToggle.css';

export function ModeToggle() {
    const { primaryMode, togglePrimaryMode } = useModeStore();
    const isEditing = primaryMode === 'edit';

    return (
        <div className="mode-toggle-container" data-testid="mode-toggle">
            <button
                className={`mode-toggle-btn edit-btn ${isEditing ? 'active' : ''}`}
                onClick={() => !isEditing && togglePrimaryMode()}
                title="Edit Mode - Build tracks (M)"
                aria-pressed={isEditing}
                data-testid="mode-edit-btn"
            >
                <span className="mode-icon"><Wrench size={16} /></span>
                <span className="mode-label">Edit</span>
            </button>

            <button
                className={`mode-toggle-btn simulate-btn ${!isEditing ? 'active' : ''}`}
                onClick={() => isEditing && togglePrimaryMode()}
                title="Simulate Mode - Run trains (M)"
                aria-pressed={!isEditing}
                data-testid="mode-simulate-btn"
            >
                <span className="mode-icon"><TrainFront size={16} /></span>
                <span className="mode-label">Simulate</span>
            </button>
        </div>
    );
}
