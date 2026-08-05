import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Swap() {
  const [tab, setTab] = useState('browse')

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-hub-phones mb-1">Kankara Swap</h1>
      <p className="text-sm text-ink/60 mb-6">Trade your device for another, with an optional cash top-up.</p>

      <div className="flex gap-1 border-b border-ink/10 mb-4">
        {['browse', 'list', 'mine'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-hub-phones border-b-2 border-hub-phones' : 'text-ink/50'
            }`}
          >
            {t === 'browse' ? 'Browse' : t === 'list' ? 'List mine' : 'My offers'}
          </button>
        ))}
      </div>

      {tab === 'browse' && <BrowseSwaps />}
      {tab === 'list' && <ListDevice />}
      {tab === 'mine' && <MyListingsAndOffers />}
    </div>
  )
}

function BrowseSwaps() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [proposingFor, setProposingFor] = useState(null)
  const [offeredDevice, setOfferedDevice] = useState('')
  const [cashAdjustment, setCashAdjustment] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('swap_listings')
      .select('id, device_description, condition, desired_devices, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    setListings(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function submitProposal(listingId) {
    setError(null)
    if (!offeredDevice) {
      setError('Describe the device you\u2019re offering.')
      return
    }
    setSubmitting(true)

    const { error } = await supabase.rpc('propose_swap', {
      p_swap_listing_id: listingId,
      p_offered_device_description: offeredDevice,
      p_cash_adjustment: cashAdjustment ? Number(cashAdjustment) : 0,
      p_notes: notes || null,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setProposingFor(null)
    setOfferedDevice('')
    setCashAdjustment('')
    setNotes('')
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (listings.length === 0) return <p className="text-ink/50">No open swap listings yet.</p>

  return (
    <div className="space-y-2">
      {listings.map((l) => (
        <div key={l.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <p className="text-sm font-medium">{l.device_description}</p>
          <p className="text-xs text-ink/50">
            {l.condition?.replace('_', ' ')} · Wants: {l.desired_devices}
          </p>

          {proposingFor === l.id ? (
            <div className="mt-2 space-y-2">
              <input
                placeholder="Device you're offering"
                value={offeredDevice}
                onChange={(e) => setOfferedDevice(e.target.value)}
                className="w-full text-sm rounded border border-ink/20 px-2 py-1"
              />
              <input
                type="number"
                placeholder="Cash adjustment (+ you pay, − you request)"
                value={cashAdjustment}
                onChange={(e) => setCashAdjustment(e.target.value)}
                className="w-full text-sm rounded border border-ink/20 px-2 py-1 font-mono"
              />
              <input
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm rounded border border-ink/20 px-2 py-1"
              />
              {error && <p className="text-xs text-market-red">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => submitProposal(l.id)}
                  disabled={submitting}
                  className="flex-1 text-xs bg-hub-phones text-white rounded py-1.5 disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Send proposal'}
                </button>
                <button onClick={() => setProposingFor(null)} className="text-xs text-ink/50 px-2">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setProposingFor(l.id)}
              className="text-xs text-hub-phones underline mt-2"
            >
              Propose a swap
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function ListDevice() {
  const [deviceDescription, setDeviceDescription] = useState('')
  const [condition, setCondition] = useState('fairly_used')
  const [desiredDevices, setDesiredDevices] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('swap_listings').insert({
      lister_id: user.id,
      device_description: deviceDescription,
      condition,
      desired_devices: desiredDevices,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setDeviceDescription('')
    setDesiredDevices('')
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="deviceDescription" className="block text-sm font-medium mb-1">
          Your device
        </label>
        <input
          id="deviceDescription"
          required
          value={deviceDescription}
          onChange={(e) => setDeviceDescription(e.target.value)}
          placeholder="e.g. iPhone 12, 128GB, screen has a small crack"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-phones focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="condition" className="block text-sm font-medium mb-1">
          Condition
        </label>
        <select
          id="condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-phones focus:outline-none"
        >
          <option value="new">New</option>
          <option value="fairly_used">Fairly used</option>
          <option value="nigerian_used">Nigerian used</option>
          <option value="foreign_used_tokunbo">Foreign used (Tokunbo)</option>
          <option value="refurbished">Refurbished</option>
        </select>
      </div>

      <div>
        <label htmlFor="desiredDevices" className="block text-sm font-medium mb-1">
          What are you hoping to get?
        </label>
        <input
          id="desiredDevices"
          required
          value={desiredDevices}
          onChange={(e) => setDesiredDevices(e.target.value)}
          placeholder="e.g. Samsung Galaxy S21 or similar"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-surface focus:border-hub-phones focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-market-red">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-market-green">Listed — visible to other buyers now.</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-hub-phones text-paper font-display font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {submitting ? 'Listing…' : 'List my device'}
      </button>
    </form>
  )
}

function MyListingsAndOffers() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('swap_listings')
      .select('id, device_description, status, swap_offers(id, offered_device_description, cash_adjustment, notes, status)')
      .eq('lister_id', user.id)
      .order('created_at', { ascending: false })
    setListings(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function respond(offerId, action) {
    setActing(offerId)
    const { error } = await supabase.rpc('respond_to_swap_offer', { p_offer_id: offerId, p_action: action })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (listings.length === 0) return <p className="text-ink/50">You haven't listed anything yet.</p>

  return (
    <div className="space-y-3">
      {listings.map((l) => (
        <div key={l.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{l.device_description}</p>
            <span className="text-xs font-medium text-indigo capitalize">{l.status}</span>
          </div>

          {l.swap_offers?.length > 0 ? (
            <div className="mt-2 space-y-2">
              {l.swap_offers.map((o) => (
                <div key={o.id} className="rounded bg-paper px-2 py-1.5">
                  <p className="text-xs font-medium">{o.offered_device_description}</p>
                  <p className="text-xs text-ink/50">
                    {o.cash_adjustment > 0 && `+₦${Number(o.cash_adjustment).toLocaleString()} to you`}
                    {o.cash_adjustment < 0 && `−₦${Number(Math.abs(o.cash_adjustment)).toLocaleString()} you pay`}
                    {o.cash_adjustment === 0 && 'Even swap, no cash'}
                  </p>
                  {o.notes && <p className="text-xs text-ink/50">{o.notes}</p>}

                  {o.status === 'pending' && l.status === 'open' && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => respond(o.id, 'accept')}
                        disabled={acting === o.id}
                        className="text-xs bg-market-green text-white rounded px-2 py-1 disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respond(o.id, 'decline')}
                        disabled={acting === o.id}
                        className="text-xs bg-market-red text-white rounded px-2 py-1 disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {o.status !== 'pending' && (
                    <p className="text-xs font-medium text-ink/40 capitalize mt-1">{o.status}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink/40 mt-1">No offers yet.</p>
          )}
        </div>
      ))}
    </div>
  )
}
