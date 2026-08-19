import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Registered after render so it never delays first paint. Guarded by a
// feature check since not every browser supports service workers.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Real, important fix: browsers can cache sw.js itself via normal
        // HTTP caching for up to 24 hours, silently delaying when a device
        // ever discovers a new version exists at all. Forcing a real
        // update() check on every load means a device stuck on an old,
        // broken service worker self-heals on its very next visit, rather
        // than needing a manual uninstall.
        registration.update()
      })
      .catch((err) => {
        console.error('Service worker registration failed:', err)
      })
  })
}
