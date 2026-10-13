import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installErrorTracking } from './lib/analytics'

// Before render, so errors thrown while mounting are tracked too.
installErrorTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
