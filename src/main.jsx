import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Development-only FPS/memory monitor using stats.js
// stats.js is installed as a devDependency and auto-instruments
// the requestAnimationFrame loop when loaded
if (import.meta.env.DEV) {
  import('stats.js').then(({ default: Stats }) => {
    const stats = new Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: memory
    stats.dom.style.top = ''
    stats.dom.style.bottom = '12px'
    stats.dom.style.right = '12px'
    stats.dom.style.left = 'auto'
    stats.dom.style.zIndex = '100'
    document.body.appendChild(stats.dom)

    // Instrument requestAnimationFrame with stats.begin/end
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
