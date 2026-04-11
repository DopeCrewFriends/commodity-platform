import './polyfill-buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/styles.css'
import './styles/shell.css'
import './styles/institutional.css'
import { clearAllEscrows } from './utils/storage'

// One-time cache wipe: open app with ?clearEscrowCache=1 to clear escrow (and related) localStorage, then reload
if (typeof window !== 'undefined' && window.location.search.includes('clearEscrowCache=1')) {
  try {
    clearAllEscrows()
    window.history.replaceState({}, '', window.location.pathname + (window.location.hash || ''))
    window.location.reload()
  } catch (_) {}
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Root render error:', error, info.componentStack)
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            background: '#0a0e1a',
            color: '#f8fafc',
          }}
        >
          <h1 style={{ marginBottom: '1rem' }}>App failed to load</h1>
          <p style={{ opacity: 0.9, marginBottom: '1rem' }}>
            Check the browser console (F12 → Console) for the full error.
          </p>
          <pre
            style={{
              padding: '1rem',
              background: '#111827',
              borderRadius: 8,
              overflow: 'auto',
              fontSize: 13,
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML =
    '<p style="font-family:system-ui;padding:2rem">Missing #root in index.html</p>'
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>,
  )
}

