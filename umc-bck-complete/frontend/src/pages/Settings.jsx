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
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
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
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-indigo focus:outline-none"
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

      {saved && <p className="text-sm text-market-green">Saved.</p>}
    </div>
  )
}
