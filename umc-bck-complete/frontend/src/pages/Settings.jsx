import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ha', label: 'Hausa' },
  { value: 'ig', label: 'Igbo' },
  { value: 'yo', label: 'Yoruba' },
]

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
]

export default function Settings() {
  const [language, setLanguage] = useState('en')
  const [theme, setTheme] = useState('light')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('language_preference, theme_preference')
        .eq('id', user.id)
        .single()
      if (data) {
        setLanguage(data.language_preference)
        setTheme(data.theme_preference)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save(field, value) {
    setSaved(false)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ [field]: value }).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="p-4 max-w-sm mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Settings</h1>
      <p className="text-sm text-ink/60 mb-6">Your preference is saved and will follow you across devices.</p>

      <div className="mb-6">
        <label htmlFor="language" className="block text-sm font-medium mb-1">
          Language
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value)
            save('language_preference', e.target.value)
          }}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        {language !== 'en' && (
          <p className="text-xs text-gold-dark mt-1">
            Your preference is saved, but the app itself is currently English-only — full translation is a larger
            piece of work not yet built. This won't silently pretend to translate anything.
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="theme" className="block text-sm font-medium mb-1">
          Theme
        </label>
        <select
          id="theme"
          value={theme}
          onChange={(e) => {
            setTheme(e.target.value)
            save('theme_preference', e.target.value)
          }}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-indigo focus:outline-none"
        >
          {THEMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink/50 mt-1">
          Saved for when dark mode styling is built — the app is light-only right now, so this doesn't visually
          change anything yet.
        </p>
      </div>

      <IdentityVerificationSection />

      {saved && <p className="text-sm text-market-green">Saved.</p>}
    </div>
  )
}

function IdentityVerificationSection() {
  const [status, setStatus] = useState(null)
  const [rejectionReason, setRejectionReason] = useState(null)
  const [idType, setIdType] = useState('nin')
  const [idNumber, setIdNumber] = useState('')
  const [idPhoto, setIdPhoto] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('identity_verifications')
      .select('status, rejection_reason')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setStatus(data?.status || null)
    setRejectionReason(data?.rejection_reason || null)
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!idNumber.trim() || !idPhoto) {
      setMessage('Both a real ID number and a real photo of the document are required.')
      return
    }
    setSubmitting(true)
    setMessage(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const path = `${user.id}/${idType}-${Date.now()}.${idPhoto.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('id-documents').upload(path, idPhoto)
    if (uploadError) {
      setSubmitting(false)
      setMessage(uploadError.message)
      return
    }
    const { data: urlData } = supabase.storage.from('id-documents').getPublicUrl(path)

    const { error } = await supabase.rpc('submit_identity_verification', {
      p_id_type: idType,
      p_id_number: idNumber.trim(),
      p_id_photo_url: urlData.publicUrl,
    })
    setSubmitting(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Submitted — an admin will review this shortly.')
    setIdNumber('')
    setIdPhoto(null)
    load()
  }

  return (
    <div className="mb-6 pb-6 border-b border-ink/10">
      <h2 className="text-sm font-medium mb-2">Identity verification</h2>
      <p className="text-xs text-ink/50 mb-3">
        Real ID number and a real photo of the document — required to place your second order onward, since money
        and real identity are both involved here.
      </p>

      {status === 'approved' && (
        <p className="text-sm text-market-green">✅ Verified — you're all set.</p>
      )}
      {status === 'pending' && (
        <p className="text-sm text-gold-dark">⏳ Under review — an admin will confirm this shortly.</p>
      )}

      {(status === null || status === 'rejected') && (
        <>
          {status === 'rejected' && (
            <p className="text-xs text-market-red mb-2">
              Your last submission was declined{rejectionReason ? `: ${rejectionReason}` : ''} — please resubmit.
            </p>
          )}
          <form onSubmit={submit} className="space-y-2">
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface text-sm"
            >
              <option value="nin">NIN (National ID)</option>
              <option value="voters_card">Voter's Card (INEC)</option>
              <option value="drivers_license">Driver's License (FRSC)</option>
              <option value="passport">International Passport</option>
            </select>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="ID number"
              className="w-full rounded border border-ink/20 px-3 py-2 bg-surface text-sm"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setIdPhoto(e.target.files[0])}
              className="w-full text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-indigo text-paper py-2 text-sm disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit for verification'}
            </button>
          </form>
        </>
      )}
      {message && <p className="text-xs text-ink/60 mt-2">{message}</p>}
    </div>
  )
}
