import { StageWrapper } from './components/canvas/StageWrapper';
import { Toolbar } from './components/ui/Toolbar';
import { PartsBin } from './components/ui/PartsBin';
import { DebugOverlay } from './components/ui/DebugOverlay';

function App() {
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
