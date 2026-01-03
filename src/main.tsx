import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Debug overlay hint (dev only)
if (import.meta.env.DEV) {
    console.log(
        '%c🔧 Debug overlay available!',
        'color: #00ff00; font-weight: bold',
        '\nPress ` (backtick) to toggle, or add ?debug to URL'
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
