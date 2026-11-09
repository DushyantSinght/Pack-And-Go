// © 2026 Dushyant Singh Tanwar (DST). All rights reserved. Unauthorised copying prohibited — see LICENSE.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/motion.css'
import App from './App.jsx'
import { MoveProvider } from './context/MoveContext.jsx'
import { CommsProvider } from './context/CommsContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { reportClientError } from './services/api.js'

// Author signature (visible in the browser developer console)
console.log(
  '%cPack&Go%c  designed & built by DST — Dushyant Singh Tanwar\n© 2026 All rights reserved. Unauthorised copying prohibited.',
  'font: 700 22px system-ui; color: #D4AF37;',
  'font: 12px system-ui; color: #A3A7B3;'
)
document.documentElement.dataset.author = 'DST'

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
