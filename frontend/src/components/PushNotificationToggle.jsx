import { useEffect, useState } from 'react'
import {
  pushNotificationsSupported,
  getPushSubscriptionStatus,
  enablePushNotifications,
  disablePushNotifications,
} from '../lib/pushNotifications'

// A real, honest toggle — not a fake bell icon. Explains exactly what it
// does, respects that permission is a genuine browser-level decision the
// person makes (not something we can flip on for them), and never nags
// once dismissed.
export default function PushNotificationToggle({ label }) {
  const [status, setStatus] = useState('checking')
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  async function refresh() {
    if (!pushNotificationsSupported()) {
      setStatus('unsupported')
      return
    }
    setStatus(await getPushSubscriptionStatus())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleEnable() {
    setBusy(true)
    try {
      await enablePushNotifications()
      await refresh()
    } catch (err) {
      alert(err.message)
    }
    setBusy(false)
  }

  async function handleDisable() {
    setBusy(true)
    await disablePushNotifications()
    await refresh()
    setBusy(false)
  }

  if (status === 'unsupported' || status === 'checking' || dismissed) return null

  if (status === 'subscribed') {
    return (
      <div className="mb-4 rounded border border-market-green/30 bg-market-green/10 px-3 py-2 flex items-center justify-between">
        <p className="text-xs text-market-green">🔔 Real-time notifications are on for {label}.</p>
        <button onClick={handleDisable} disabled={busy} className="text-xs text-ink/50 underline disabled:opacity-60">
          Turn off
        </button>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="mb-4 rounded border border-gold/40 bg-gold/10 px-3 py-2">
        <p className="text-xs text-gold-dark">
          🔕 Notifications are blocked in your browser settings. Enable them there to get notified of {label} without
          having to keep checking this app.
        </p>
      </div>
    )
  }

  return (
    <div className="mb-4 rounded border border-indigo/30 bg-indigo/5 px-3 py-2">
      <p className="text-xs text-ink/70 mb-2">
        🔔 Get a real, instant notification for {label} — even when this app is closed.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleEnable}
          disabled={busy}
          className="flex-1 text-xs bg-indigo text-white rounded py-1.5 disabled:opacity-60"
        >
          {busy ? 'Enabling…' : 'Enable notifications'}
        </button>
        <button onClick={() => setDismissed(true)} className="text-xs text-ink/40 px-2">
          Not now
        </button>
      </div>
    </div>
  )
}
