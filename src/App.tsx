import { useEffect } from 'react';
import { StageWrapper } from './components/canvas';
import { Toolbar, PartsBin, TrainPanel, DebugOverlay, MeasurementOverlay } from './components/ui';
import { OnboardingProvider, OnboardingHints } from './components/ui/Onboarding';
import { useModeStore } from './stores/useModeStore';
import { useEditorStore } from './stores/useEditorStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { initDebugBridge } from './utils/debugBridge';

function App() {
    const primaryMode = useModeStore(s => s.primaryMode);
    const isEditing = primaryMode === 'edit';

    // Centralized keyboard shortcuts
    useKeyboardShortcuts();

    // Expose stores to window for E2E testing and agentic dev workflows
    useEffect(() => {
        initDebugBridge();
    }, []);

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
        <OnboardingProvider>
            <div className="app" data-testid="app">
                <Toolbar />
                <main className="app-main" data-testid="app-main">
                    {/* Conditional sidebar: PartsBin in Edit, TrainPanel in Simulate */}
                    {isEditing ? <PartsBin /> : <TrainPanel />}
                    <StageWrapper />
                </main>
                <DebugOverlay />
                <MeasurementOverlay />
                {/* Tutorial hints overlay */}
                <OnboardingHints />
            </div>
        </OnboardingProvider>
    );
}

export default App;
