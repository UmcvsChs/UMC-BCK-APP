import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Repair() {
  const [tab, setTab] = useState('request')

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-hub-phones mb-1">Repair</h1>
      <p className="text-sm text-ink/60 mb-6">
        Request a diagnosis first — nothing is charged until you accept a real quote.
      </p>

      <div className="flex gap-1 border-b border-ink/10 mb-4">
        {['request', 'bookings', 'repairer'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t ? 'text-hub-phones border-b-2 border-hub-phones' : 'text-ink/50'
            }`}
          >
            {t === 'request' ? 'Request' : t === 'bookings' ? 'My bookings' : 'I\u2019m a repairer'}
          </button>
        ))}
      </div>

      {tab === 'request' && <RequestDiagnosis />}
      {tab === 'bookings' && <MyBookings />}
      {tab === 'repairer' && <RepairerBookings />}
    </div>
  )
}

function RequestDiagnosis() {
  const [repairers, setRepairers] = useState([])
  const [repairerId, setRepairerId] = useState('')
  const [deviceDescription, setDeviceDescription] = useState('')
  const [issueDescription, setIssueDescription] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('repairers')
        .select('id, device_types, specialties, years_experience')
        .eq('is_available', true)
        .eq('verification_status', 'approved')
      setRepairers(data || [])
    }
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.rpc('request_repair_diagnosis', {
      p_repairer_id: repairerId,
      p_device_description: deviceDescription,
      p_issue_description: issueDescription,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setDeviceDescription('')
    setIssueDescription('')
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="repairer" className="block text-sm font-medium mb-1">
          Repairer
        </label>
        <select
          id="repairer"
          required
          value={repairerId}
          onChange={(e) => setRepairerId(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-hub-phones focus:outline-none"
        >
          <option value="">Select a repairer</option>
          {repairers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.device_types?.join(', ')} — {r.specialties?.join(', ') || 'General repair'}
              {r.years_experience != null && ` (${r.years_experience}y)`}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="deviceDescription" className="block text-sm font-medium mb-1">
          Device
        </label>
        <input
          id="deviceDescription"
          required
          value={deviceDescription}
          onChange={(e) => setDeviceDescription(e.target.value)}
          placeholder="e.g. Tecno Spark 10"
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-hub-phones focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="issueDescription" className="block text-sm font-medium mb-1">
          What's wrong?
        </label>
        <textarea
          id="issueDescription"
          required
          rows={3}
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
          className="w-full rounded border border-ink/20 px-3 py-2 bg-white focus:border-hub-phones focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-market-red">
          {error}
        </p>
      )}
      {success && <p className="text-sm text-market-green">Request sent — waiting on a diagnosis.</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-hub-phones text-paper font-display font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Request diagnosis'}
      </button>
    </form>
  )
}

function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('repair_bookings')
      .select('id, device_description, issue_description, status, diagnosis_notes, quoted_price')
      .order('created_at', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function acceptQuote(bookingId) {
    setActing(bookingId)
    const { error } = await supabase.rpc('accept_repair_quote', { p_booking_id: bookingId })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (bookings.length === 0) return <p className="text-ink/50">No bookings yet.</p>

  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <div key={b.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <p className="text-sm font-medium">{b.device_description}</p>
          <p className="text-xs text-ink/50">{b.issue_description}</p>
          {b.diagnosis_notes && <p className="text-xs text-ink/60 mt-1">{b.diagnosis_notes}</p>}
          {b.quoted_price != null && (
            <p className="font-mono text-sm text-indigo mt-1">₦{Number(b.quoted_price).toLocaleString()}</p>
          )}
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-medium text-hub-phones capitalize">{b.status}</span>
            {b.status === 'diagnosed' && (
              <button
                onClick={() => acceptQuote(b.id)}
                disabled={acting === b.id}
                className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60"
              >
                Accept quote
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function RepairerBookings() {
  const [repairer, setRepairer] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState({})
  const [notes, setNotes] = useState({})
  const [acting, setActing] = useState(null)

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: r } = await supabase.from('repairers').select('*').eq('user_id', user.id).maybeSingle()
    setRepairer(r)
    if (r) {
      const { data } = await supabase
        .from('repair_bookings')
        .select('id, device_description, issue_description, status, quoted_price')
        .eq('repairer_id', r.id)
        .order('created_at', { ascending: false })
      setBookings(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function submitDiagnosis(bookingId) {
    setActing(bookingId)
    const { error } = await supabase.rpc('provide_repair_diagnosis', {
      p_booking_id: bookingId,
      p_diagnosis_notes: notes[bookingId] || '',
      p_quoted_price: Number(quotes[bookingId]),
    })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  async function complete(bookingId) {
    setActing(bookingId)
    const { error } = await supabase.rpc('mark_repair_completed', { p_booking_id: bookingId })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>

  if (!repairer) {
    return (
      <div className="text-center py-8">
        <p className="text-ink/60 mb-3 text-sm">You're not registered as a repairer yet.</p>
        <Link to="/phones/repair/register" className="text-hub-phones font-medium text-sm">
          Register as a repairer →
        </Link>
      </div>
    )
  }

  if (bookings.length === 0) return <p className="text-ink/50">No bookings assigned to you yet.</p>

  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <div key={b.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <p className="text-sm font-medium">{b.device_description}</p>
          <p className="text-xs text-ink/50">{b.issue_description}</p>
          <p className="text-xs font-medium text-hub-phones capitalize mt-1">{b.status}</p>

          {b.status === 'requested' && (
            <div className="mt-2 space-y-2">
              <textarea
                placeholder="Diagnosis notes"
                value={notes[b.id] || ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [b.id]: e.target.value }))}
                className="w-full text-xs rounded border border-ink/20 px-2 py-1"
                rows={2}
              />
              <input
                type="number"
                placeholder="Quoted price ₦"
                value={quotes[b.id] || ''}
                onChange={(e) => setQuotes((prev) => ({ ...prev, [b.id]: e.target.value }))}
                className="w-full text-xs rounded border border-ink/20 px-2 py-1 font-mono"
              />
              <button
                onClick={() => submitDiagnosis(b.id)}
                disabled={acting === b.id}
                className="w-full text-xs bg-hub-phones text-white rounded py-1.5 disabled:opacity-60"
              >
                Send diagnosis & quote
              </button>
            </div>
          )}

          {(b.status === 'accepted' || b.status === 'in_progress') && (
            <button
              onClick={() => complete(b.id)}
              disabled={acting === b.id}
              className="w-full mt-2 text-xs bg-market-green text-white rounded py-1.5 disabled:opacity-60"
            >
              Mark completed
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
