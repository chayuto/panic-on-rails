import { StageWrapper } from './components/canvas/StageWrapper';
import { Toolbar } from './components/ui/Toolbar';
import { PartsBin } from './components/ui/PartsBin';

function App() {
    return (
        <div className="app">
            <Toolbar />
            <main className="app-main">
                <PartsBin />
                <StageWrapper />
            </main>
        </div>
    );
}

export default App;
