import { useEffect } from 'react';
import { StageWrapper } from './components/canvas/StageWrapper';
import { Toolbar } from './components/ui/Toolbar';
import { PartsBin } from './components/ui/PartsBin';
import { DebugOverlay } from './components/ui/DebugOverlay';
import { useModeStore } from './stores/useModeStore';
import { useEditorStore } from './stores/useEditorStore';

function App() {
    const primaryMode = useModeStore(s => s.primaryMode);

    // Clear wire source and drag state when mode changes
    // This replaces the old behavior in useEditorStore.setMode()
    useEffect(() => {
        const editorStore = useEditorStore.getState();
        editorStore.clearWireSource();
        editorStore.endDrag();
    }, [primaryMode]);

    return (
        <div className="app">
            <Toolbar />
            <main className="app-main">
                <PartsBin />
                <StageWrapper />
            </main>
            <DebugOverlay />
        </div>
    );
}

export default App;
