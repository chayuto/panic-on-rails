import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Startup banner with build time: in production too, to tell which build is live
// eslint-disable-next-line no-console
console.log(
    '%cPanic on Rails',
    'color: #ff6b6b; font-weight: bold; font-size: 14px',
    `\nBuild: ${__BUILD_TIME__}`
);

// Debug overlay hint (dev only)
if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(
        '%cDebug overlay available!',
        'color: #00ff00; font-weight: bold',
        '\nPress ` (backtick) to toggle, or add ?debug to URL'
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)

