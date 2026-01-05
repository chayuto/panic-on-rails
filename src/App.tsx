import { useEffect } from 'react';
import { StageWrapper } from './components/canvas';
import { Toolbar, PartsBin, TrainPanel, DebugOverlay, MeasurementOverlay } from './components/ui';
import { useModeStore } from './stores/useModeStore';
import { useEditorStore } from './stores/useEditorStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
    const primaryMode = useModeStore(s => s.primaryMode);
    const isEditing = primaryMode === 'edit';

    // Centralized keyboard shortcuts
    useKeyboardShortcuts();

    // Handle mode change side effects
    useEffect(() => {
        // Update body class for global CSS theming
        document.body.classList.remove('mode-edit', 'mode-simulate');
        document.body.classList.add(`mode-${primaryMode}`);

        // Clear wire source and drag state when mode changes
        const editorStore = useEditorStore.getState();
        editorStore.clearWireSource();
        editorStore.endDrag();
    }, [primaryMode]);

    return (
        <div className="app">
            <Toolbar />
            <main className="app-main">
                {/* Conditional sidebar: PartsBin in Edit, TrainPanel in Simulate */}
                {isEditing ? <PartsBin /> : <TrainPanel />}
                <StageWrapper />
            </main>
            <DebugOverlay />
            <MeasurementOverlay />
        </div>
    );
}

export default App;
