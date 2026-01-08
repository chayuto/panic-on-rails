/**
 * ModeToggle - Prominent toggle between Edit and Simulate modes
 * 
 * Features:
 * - Two-button design for clear mode indication
 * - Keyboard shortcut (M key) support
 * - Visual distinction with colored backgrounds
 * - Subtle pulse animation in Simulate mode
 * - Accessibility: aria-pressed, focus states
 */

import { useEffect } from 'react';
import { useModeStore } from '../../../stores/useModeStore';
import './ModeToggle.css';

export function ModeToggle() {
    const { primaryMode, togglePrimaryMode } = useModeStore();
    const isEditing = primaryMode === 'edit';

    // Keyboard shortcut handler (M key toggles mode)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                e.target instanceof HTMLSelectElement
            ) {
                return;
            }

            // M key toggles mode
            if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                togglePrimaryMode();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePrimaryMode]);

    return (
        <div className="mode-toggle-container">
            <button
                className={`mode-toggle-btn edit-btn ${isEditing ? 'active' : ''}`}
                onClick={() => !isEditing && togglePrimaryMode()}
                title="Edit Mode - Build tracks (M)"
                aria-pressed={isEditing}
            >
                <span className="mode-icon">✏️</span>
                <span className="mode-label">Edit</span>
            </button>

            <button
                className={`mode-toggle-btn simulate-btn ${!isEditing ? 'active' : ''}`}
                onClick={() => isEditing && togglePrimaryMode()}
                title="Simulate Mode - Run trains (M)"
                aria-pressed={!isEditing}
            >
                <span className="mode-icon">▶️</span>
                <span className="mode-label">Simulate</span>
            </button>
        </div>
    );
}
