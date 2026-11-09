import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { MoveProvider } from './context/MoveContext.jsx'
import { CommsProvider } from './context/CommsContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

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
