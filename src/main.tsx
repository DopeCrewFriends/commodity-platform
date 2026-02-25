import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/styles.css'
import { clearAllEscrows } from './utils/storage'

// One-time cache wipe: open app with ?clearEscrowCache=1 to clear escrow (and related) localStorage, then reload
if (typeof window !== 'undefined' && window.location.search.includes('clearEscrowCache=1')) {
  try {
    clearAllEscrows()
    window.history.replaceState({}, '', window.location.pathname + (window.location.hash || ''))
    window.location.reload()
  } catch (_) {}
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

