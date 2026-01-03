import { useEffect } from 'react';
import { StageWrapper } from './components/canvas/StageWrapper';
import { Toolbar } from './components/ui/Toolbar';
import { PartsBin } from './components/ui/PartsBin';
import { TrainPanel } from './components/ui/TrainPanel';
import { DebugOverlay } from './components/ui/DebugOverlay';
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
        </div>
    );
}

export default App;
