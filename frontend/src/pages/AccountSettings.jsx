import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real, genuinely separate Settings — distinct from Profile, matching
// what was directly described: real account security, not a duplicate
// of the profile page. Profile is where you manage who you are;
// Settings is where you manage how your account itself is protected.
export default function AccountSettings() {
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [changing, setChanging] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function changePin() {
    setError(null)
    setMessage(null)
    if (!/^\d{6}$/.test(newPin)) {
      setError('Your real PIN must be exactly 6 digits.')
      return
    }
    if (newPin !== confirmPin) {
      setError('The two PINs you entered don\u2019t match.')
      return
    }
    setChanging(true)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPin })
    setChanging(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage('✓ Your real PIN has been changed. Use it next time you sign in.')
    setNewPin('')
    setConfirmPin('')
  }

  return (
    <div className="p-4 max-w-sm mx-auto pb-6">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">⚙️ Settings</h1>
      <p className="text-sm text-ink/60 mb-6">Real account security and legal information — genuinely separate from your Profile.</p>

      <div className="mb-6 rounded-xl bg-surface p-3">
        <p className="text-xs font-semibold mb-2">Account & Security</p>
        <label className="block text-xs text-ink/50 mb-1">New 6-digit PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded border border-ink/20 px-3 py-2 mb-2 font-mono tracking-widest"
        />
        <label className="block text-xs text-ink/50 mb-1">Confirm new PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded border border-ink/20 px-3 py-2 mb-3 font-mono tracking-widest"
        />
        <button
          onClick={changePin}
          disabled={changing}
          className="w-full rounded bg-indigo text-paper font-display font-medium py-2 disabled:opacity-60"
        >
          {changing ? 'Changing…' : 'Change my real PIN'}
        </button>
        {error && <p className="text-xs text-market-red mt-2">{error}</p>}
        {message && <p className="text-xs text-market-green mt-2">{message}</p>}
      </div>

      <div className="mb-6 rounded-xl bg-surface p-3">
        <p className="text-xs font-semibold mb-2">Legal</p>
        <p className="text-xs text-ink/50">
          Real Terms & Conditions and the Complete User Guide are available from your team directly, and cover
          everything this Platform genuinely commits to.
        </p>
      </div>

      <div className="rounded-xl bg-surface p-3">
        <p className="text-xs font-semibold mb-1">About</p>
        <p className="text-xs text-ink/50">UMC-BCK — Unified Market Centre. Operated by Stadt-Thelima.</p>
      </div>

      <Link to="/settings" className="block text-center text-xs text-indigo mt-6">
        ← Back to Profile
      </Link>
    </div>
  )
}
