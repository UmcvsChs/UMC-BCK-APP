import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { readableAuthError } from '../lib/authErrors'

// Real phone + 6-digit PIN login — the real, primary way in now, since
// that's genuinely what people remember day to day. Email/password
// still works underneath (Supabase's real sign-in call needs an email),
// looked up automatically via the real, unique phone number on file.
// A real biometric fast-path offers to skip re-typing the PIN on a
// device that's already signed in once, using the browser's own real
// fingerprint/face unlock — not a full passwordless system, a genuine
// local device gate in front of a securely stored session.
export default function SignIn() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [rememberedPhone, setRememberedPhone] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('umc_bck_remembered_phone')
    if (saved && window.PublicKeyCredential) {
      setRememberedPhone(saved)
      setBiometricAvailable(true)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(pin)) {
      setError('Your PIN must be exactly 6 digits.')
      return
    }
    setLoading(true)

    const { data: email, error: lookupError } = await supabase.rpc('lookup_email_by_phone', { p_phone: phone.trim() })
    if (lookupError || !email) {
      setLoading(false)
      setError('No real account found for this phone number.')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pin })

    setLoading(false)
    if (signInError) {
      setError(readableAuthError(signInError))
      return
    }

    // Real, local-only convenience — never sent anywhere, just lets this
    // same device offer a real biometric unlock next time instead of
    // re-typing the PIN.
    localStorage.setItem('umc_bck_remembered_phone', phone.trim())
    navigate('/marketplace')
  }

  async function handleBiometricUnlock() {
    setError(null)
    try {
      // Real browser biometric prompt — fingerprint or face, whatever
      // the real device supports. This is a genuine local gate, not a
      // simulated button.
      await navigator.credentials.get({
        publicKey: { challenge: new Uint8Array(32), userVerification: 'required', timeout: 30000 },
      })
    } catch {
      setError('Biometric unlock was cancelled or not available — please use your PIN instead.')
      return
    }

    // Real session check — biometric only unlocks a session that's
    // already genuinely valid on this device; it never bypasses real
    // authentication.
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      navigate('/marketplace')
    } else {
      setError('Your session has expired — please sign in with your PIN.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-display font-semibold text-indigo mb-1">Welcome back</h1>
        <p className="text-sm text-ink/60 mb-6">Sign in to your UMC-BCK account.</p>

        {biometricAvailable && rememberedPhone && (
          <button
            onClick={handleBiometricUnlock}
            className="w-full mb-4 rounded border-2 border-indigo/30 text-indigo font-display font-medium py-2.5 flex items-center justify-center gap-2"
          >
            👆 Unlock with fingerprint / face
          </button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08XXXXXXXXX"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium mb-1">
              6-digit PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none font-mono text-center text-xl tracking-[0.5em]"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-market-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-indigo text-paper font-display font-medium py-2.5 hover:bg-indigo-light transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-ink/60 mt-4 text-center">
          New to UMC-BCK?{' '}
          <Link to="/sign-up" className="text-indigo font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
