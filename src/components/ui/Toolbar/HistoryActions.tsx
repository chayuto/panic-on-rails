/**
 * HistoryActions - Undo / Redo buttons for the toolbar (Edit mode only).
 *
 * Mirrors the Ctrl/Cmd+Z and Ctrl/Cmd+Y keyboard shortcuts. Buttons are
 * disabled when the corresponding stack is empty.
 */

import { Undo2, Redo2 } from 'lucide-react';
import { useHistoryStore, selectCanUndo, selectCanRedo } from '../../../stores/useHistoryStore';

export function HistoryActions() {
    const canUndo = useHistoryStore(selectCanUndo);
    const canRedo = useHistoryStore(selectCanRedo);
    const undo = useHistoryStore(s => s.undo);
    const redo = useHistoryStore(s => s.redo);

    return (
        <>
            <button
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="toolbar-btn-icon"
                data-testid="history-undo"
            >
                <Undo2 size={16} />
            </button>
            <button
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className="toolbar-btn-icon"
                data-testid="history-redo"
            >
                <Redo2 size={16} />
            </button>
        </>
    );
}
