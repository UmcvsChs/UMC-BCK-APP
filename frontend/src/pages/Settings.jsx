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
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [newLabel, setNewLabel] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [favourites, setFavourites] = useState([])
  const [favSellerId, setFavSellerId] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [favMessage, setFavMessage] = useState(null)

  async function handleAvatarUpload(file) {
    if (!file) return
    setUploadingAvatar(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setUploadingAvatar(false)
      alert('Your session seems to have expired — please sign in again and retry.')
      return
    }

    // Real, defensive fix: a filename with spaces, parentheses, or other
    // special characters can alter how the real storage path is parsed,
    // which is exactly what the real RLS policy checks against. Sanitizing
    // it here guarantees the path structure the policy expects.
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')
    const path = `${user.id}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })

    if (uploadError) {
      setUploadingAvatar(false)
      alert(`Could not upload: ${uploadError.message}`)
      return
    }

    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: publicUrl.publicUrl }).eq('id', user.id)
    setAvatarUrl(publicUrl.publicUrl)
    setUploadingAvatar(false)
  }

  async function loadAll() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('language_preference, theme_preference, full_name, phone, avatar_url')
      .eq('id', user.id)
      .single()
    if (data) {
      setLanguage(data.language_preference)
      setTheme(data.theme_preference)
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
      setAvatarUrl(data.avatar_url || null)
    }
    const { data: addr } = await supabase
      .from('delivery_addresses')
      .select('id, label, full_address, is_default')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
    setAddresses(addr || [])

    const { data: favs } = await supabase
      .from('favourite_sellers')
      .select('id, sellers(id, store_name)')
      .eq('user_id', user.id)
    setFavourites(favs || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
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

  async function savePersonalInfo(e) {
    e.preventDefault()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addAddress(e) {
    e.preventDefault()
    if (!newLabel.trim() || !newAddress.trim()) return
    const { error } = await supabase.rpc('save_delivery_address', {
      p_label: newLabel.trim(),
      p_full_address: newAddress.trim(),
      p_is_default: addresses.length === 0,
    })
    if (error) {
      alert(error.message)
      return
    }
    setNewLabel('')
    setNewAddress('')
    loadAll()
  }

  async function deleteAddress(id) {
    await supabase.rpc('delete_delivery_address', { p_address_id: id })
    loadAll()
  }

  async function addFavourite(e) {
    e.preventDefault()
    await addFavouriteById(favSellerId)
  }

  async function addFavouriteById(id) {
    setFavMessage(null)
    if (!id.trim()) return
    const { error } = await supabase.rpc('add_favourite_seller', { p_seller_id: id.trim() })
    if (error) {
      setFavMessage(error.message)
      return
    }
    setFavSellerId('')
    loadAll()
  }

  useEffect(() => {
    if (!scannerOpen) return
    let html5QrCode
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      html5QrCode = new Html5Qrcode('fav-seller-qr-reader')
      html5QrCode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            addFavouriteById(decodedText)
            html5QrCode.stop().catch(() => {})
            setScannerOpen(false)
          },
          () => {}
        )
        .catch(() => setFavMessage('Could not access the camera — check permissions, or add by ID below.'))
    })
    return () => {
      if (html5QrCode) html5QrCode.stop().catch(() => {})
    }
  }, [scannerOpen])

  async function removeFavourite(sellerId) {
    await supabase.rpc('remove_favourite_seller', { p_seller_id: sellerId })
    loadAll()
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="p-4 max-w-sm mx-auto pb-6">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">👤 My Profile</h1>
      <p className="text-sm text-ink/60 mb-6">Manage your account and preferences.</p>

      <div className="flex flex-col items-center mb-6">
        <label htmlFor="avatar-upload" className="relative cursor-pointer group">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Your profile photo"
              className="w-24 h-24 rounded-full object-cover border-2 border-gold"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo/10 border-2 border-dashed border-indigo/40 flex items-center justify-center text-3xl">
              👤
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
            {uploadingAvatar ? 'Uploading…' : 'Change photo'}
          </div>
          <input
            id="avatar-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploadingAvatar}
            onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
          />
        </label>
        <p className="text-xs text-ink/50 mt-2">
          Tap to upload your real photo, company logo, or shop front — whatever helps people recognize you.
        </p>
      </div>

      <div className="mb-6 rounded-xl bg-surface p-3">
        <p className="text-xs font-semibold mb-2">Personal information</p>
        <form onSubmit={savePersonalInfo} className="space-y-2">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white text-sm"
          />
          <button type="submit" className="w-full rounded bg-indigo text-paper py-2 text-sm font-medium">
            Save changes
          </button>
        </form>
      </div>

      <div className="mb-6 rounded-xl bg-surface p-3">
        <p className="text-xs font-semibold mb-2">Delivery addresses</p>
        {addresses.map((a) => (
          <div key={a.id} className="rounded bg-white px-3 py-2 mb-2 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">
                {a.label} {a.is_default && <span className="text-xs bg-market-green/10 text-market-green rounded px-1.5 py-0.5 ml-1">Default</span>}
              </p>
              <p className="text-xs text-ink/50">{a.full_address}</p>
            </div>
            <button onClick={() => deleteAddress(a.id)} className="text-xs text-market-red">
              Remove
            </button>
          </div>
        ))}
        <form onSubmit={addAddress} className="space-y-2 mt-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Home, Office)"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white text-sm"
          />
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="House no., street, area, LGA"
            className="w-full rounded border border-ink/20 px-3 py-2 bg-white text-sm"
          />
          <button type="submit" className="w-full rounded border border-dashed border-ink/30 py-2 text-sm text-ink/60">
            + Add address
          </button>
        </form>
      </div>

      <div className="mb-6 rounded-xl bg-surface p-3">
        <p className="text-xs font-semibold mb-1">⭐ Favourite sellers</p>
        <p className="text-xs text-ink/50 mb-2">Sellers you've saved for quick access.</p>
        {favourites.length === 0 && <p className="text-xs text-ink/40 text-center py-3">No favourites yet.</p>}
        {favourites.map((f) => (
          <div key={f.id} className="rounded bg-white px-3 py-2 mb-2 flex justify-between items-center">
            <span className="text-sm">{f.sellers?.store_name}</span>
            <button onClick={() => removeFavourite(f.sellers?.id)} className="text-xs text-market-red">
              Remove
            </button>
          </div>
        ))}
        <form onSubmit={addFavourite} className="flex gap-2 mt-2">
          <input
            value={favSellerId}
            onChange={(e) => setFavSellerId(e.target.value)}
            placeholder="Seller ID"
            className="flex-1 rounded border border-ink/20 px-3 py-2 bg-white text-sm"
          />
          <button type="submit" className="text-sm bg-gold text-ink rounded px-3">
            Add
          </button>
        </form>
        <button
          type="button"
          onClick={() => setScannerOpen((v) => !v)}
          className="w-full mt-2 text-xs text-indigo underline"
        >
          {scannerOpen ? 'Close scanner' : '📷 Or scan their real QR code'}
        </button>
        {scannerOpen && <div id="fav-seller-qr-reader" className="mt-2 rounded overflow-hidden" />}
        {favMessage && <p className="text-xs text-market-red mt-1">{favMessage}</p>}
      </div>

      <div className="mb-6 rounded-xl bg-surface p-3">
        <p className="text-xs font-semibold mb-2">Account settings</p>
        <a href="/bills" className="flex justify-between items-center py-2.5 border-b border-ink/10 text-sm">
          ⚡ Bills & Airtime <span className="text-ink/40">→</span>
        </a>
        <a href="/orders" className="flex justify-between items-center py-2.5 border-b border-ink/10 text-sm">
          📦 Order history <span className="text-ink/40">→</span>
        </a>
      </div>

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
