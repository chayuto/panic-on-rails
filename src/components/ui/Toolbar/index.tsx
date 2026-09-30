/**
 * Toolbar - Main toolbar component
 * 
 * Composes all toolbar sections:
 * - ModeToggle: Prominent Edit/Simulate mode switch
 * - SetShelfButton: Real boxed train sets (build their layouts)
 * - ShoppingListButton: The layout as real products to buy
 * - FileActions: New, Templates, Save, Load
 * - ViewActions: Grid, Reset, Mute
 * - EditToolbar: Edit mode tools (Select, Delete, Sensor, Signal, Wire)
 * - HistoryActions: Undo/Redo (Edit mode only)
 * - SimulateToolbar: Simulation controls (Play/Pause, Add Train)
 * 
 * The toolbar is the primary navigation and control panel for the application.
 */

import { TrainFront } from 'lucide-react';
import { useEditorStore } from '../../../stores/useEditorStore';
import { useModeStore } from '../../../stores/useModeStore';
import { WalletTicker } from '../WalletTicker';
import { ModeToggle } from './ModeToggle';
import { FileActions } from './FileActions';
import { ViewActions } from './ViewActions';
import { EditToolbar } from './EditToolbar';
import { HistoryActions } from './HistoryActions';
import { SimulateToolbar } from './SimulateToolbar';
import { SetShelfButton } from '../SetShelf/SetShelf';
import { ShoppingListButton } from '../ShoppingList/ShoppingList';

export function Toolbar() {
    const { selectedEdgeId } = useEditorStore();
    const { primaryMode } = useModeStore();
    const isEditing = primaryMode === 'edit';

    return (
        <header className="toolbar toolbar-compact" data-testid="toolbar">
            {/* App title */}
            <div className="toolbar-title">
                <TrainFront size={18} />
                <span>PanicOnRails</span>
            </div>

            {/* Mode toggle - prominent position right after title */}
            <ModeToggle />

            {/* Main toolbar actions - ordered by frequency */}
            <div className="toolbar-actions">
                {/* Tools specific to the current mode */}
                {isEditing ? <EditToolbar /> : <SimulateToolbar />}

                {/* Undo / Redo - edit mode only */}
                {isEditing && (
                    <>
                        <div className="toolbar-divider" />
                        <HistoryActions />
                    </>
                )}

                <div className="toolbar-divider" />

                {/* View controls - occasionally used */}
                <ViewActions />

                <div className="toolbar-divider" />

                {/* Boxed sets, the shopping list, then file operations */}
                <SetShelfButton />
                <ShoppingListButton />
                <FileActions />
            </div>

            {/* Hobby money (or the free-build badge) */}
            <WalletTicker />

            {/* Selection info - only when something selected */}
            {selectedEdgeId && (
                <span className="toolbar-info">
                    {selectedEdgeId.slice(0, 8)}...
                </span>
            )}
        </header>
    );
}

