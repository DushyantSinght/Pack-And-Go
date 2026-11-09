import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/motion.css'
import App from './App.jsx'
import { MoveProvider } from './context/MoveContext.jsx'
import { CommsProvider } from './context/CommsContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { reportClientError } from './services/api.js'

// Send uncaught errors to the server so production problems are visible.
window.addEventListener('error', (e) => reportClientError(e.error || e.message, { source: 'window.onerror' }))
window.addEventListener('unhandledrejection', (e) => reportClientError(e.reason, { source: 'unhandledrejection' }))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <MoveProvider>
        <CommsProvider>
          <App />
        </CommsProvider>
      </MoveProvider>
    </ErrorBoundary>
  </StrictMode>,
)
