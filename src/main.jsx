import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Development-only performance monitor
// Uncomment the import above to use: import Stats from 'stats.js'
// Then add <StatsPanel /> to the render tree during development
if (import.meta.env.DEV) {
  // Lazy-load only in dev mode — never shipped to production
  import('stats.js').then(({ default: Stats }) => {
    const stats = new Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: memory
    stats.dom.style.top = ''
    stats.dom.style.bottom = '12px'
    stats.dom.style.right = '12px'
    stats.dom.style.left = 'auto'
    stats.dom.style.zIndex = '100'
    document.body.appendChild(stats.dom)

    // Patch requestAnimationFrame to auto-instrument stats
    const origRAF = window.requestAnimationFrame
    window.requestAnimationFrame = (cb) => {
      return origRAF.call(window, (t) => {
        stats.begin()
        cb(t)
        stats.end()
      })
    }
  }).catch(() => {
    // stats.js not installed — silently skip
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
