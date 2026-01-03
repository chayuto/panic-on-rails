/**
 * EditToolbar - Edit mode tool buttons
 * 
 * Displays the tool selection buttons when in Edit mode:
 * - Select (default editing)
 * - Delete
 * - Sensor
 * - Signal
 * - Wire
 */

import { useModeStore } from '../../../stores/useModeStore';
import type { EditSubMode } from '../../../types/mode';

interface ToolButton {
    mode: EditSubMode;
    icon: string;
    label: string;
    title: string;
}

const EDIT_TOOLS: ToolButton[] = [
    {
        mode: 'select',
        icon: '✏️',
        label: 'Edit',
        title: 'Edit Mode - Select and move tracks'
    },
    {
        mode: 'delete',
        icon: '🗑️',
        label: 'Delete',
        title: 'Delete Tool - Click tracks to remove them'
    },
    {
        mode: 'sensor',
        icon: '📡',
        label: 'Sensor',
        title: 'Sensor Tool - Place sensors on tracks'
    },
    {
        mode: 'signal',
        icon: '🚦',
        label: 'Signal',
        title: 'Signal Tool - Place signals at nodes'
    },
    {
        mode: 'wire',
        icon: '🔌',
        label: 'Wire',
        title: 'Wire Tool - Connect sensors to switches/signals'
    },
];

export function EditToolbar() {
    const { editSubMode, setEditSubMode } = useModeStore();

    return (
        <>
            {EDIT_TOOLS.map(tool => (
                <button
                    key={tool.mode}
                    onClick={() => setEditSubMode(tool.mode)}
                    className={editSubMode === tool.mode ? 'active' : ''}
                    title={tool.title}
                >
                    {tool.icon} {tool.label}
                </button>
            ))}
        </>
    );
}
