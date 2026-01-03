/**
 * Toolbar - Main toolbar component
 * 
 * Composes all toolbar sections:
 * - ModeToggle: Prominent Edit/Simulate mode switch
 * - FileActions: New, Templates, Save, Load
 * - ViewActions: Grid, Reset, Mute
 * - EditToolbar: Edit mode tools (Select, Delete, Sensor, Signal, Wire)
 * - SimulateToolbar: Simulation controls (Play/Pause, Add Train)
 * 
 * The toolbar is the primary navigation and control panel for the application.
 */

import { useEditorStore } from '../../../stores/useEditorStore';
import { useModeStore } from '../../../stores/useModeStore';
import { BudgetTicker } from '../BudgetTicker';
import { ModeToggle } from './ModeToggle';
import { FileActions } from './FileActions';
import { ViewActions } from './ViewActions';
import { EditToolbar } from './EditToolbar';
import { SimulateToolbar } from './SimulateToolbar';

export function Toolbar() {
    const { selectedEdgeId } = useEditorStore();
    const { primaryMode } = useModeStore();
    const isEditing = primaryMode === 'edit';

    return (
        <header className="toolbar">
            {/* App title */}
            <div className="toolbar-title">
                <span>🚂</span>
                <span>PanicOnRails</span>
            </div>

            {/* Mode toggle - prominent position right after title */}
            <ModeToggle />

            {/* Budget display */}
            <BudgetTicker />

            {/* Main toolbar actions */}
            <div className="toolbar-actions">
                {/* File operations - always visible */}
                <FileActions />

                <div className="toolbar-divider" />

                {/* View controls - always visible */}
                <ViewActions />

                {/* Edit mode tools - only in edit mode */}
                {isEditing && (
                    <>
                        <div className="toolbar-divider" />
                        <EditToolbar />
                    </>
                )}

                <div className="toolbar-divider" />

                {/* Simulation controls - always visible */}
                <SimulateToolbar />

                {/* Selection info - only when something selected */}
                {selectedEdgeId && (
                    <span className="toolbar-info">
                        Selected: {selectedEdgeId.slice(0, 8)}...
                    </span>
                )}
            </div>
        </header>
    );
}

// Re-export sub-components for direct usage if needed
export { ModeToggle } from './ModeToggle';
export { FileActions } from './FileActions';
export { ViewActions } from './ViewActions';
export { EditToolbar } from './EditToolbar';
export { SimulateToolbar } from './SimulateToolbar';

