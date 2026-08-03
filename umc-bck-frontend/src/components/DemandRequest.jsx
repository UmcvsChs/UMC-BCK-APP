import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Shared by every hub — "Can't Find It" is structurally identical everywhere,
// only the hub value and accent color change. Built once, matching the
// backend's own demand_requests table, which was built generically for
// exactly this reason.
export default function DemandRequest({ hub, accentClass = 'bg-indigo', note = null }) {
  const [description, setDescription] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [myRequests, setMyRequests] = useState([])

  async function loadMyRequests() {
    const { data } = await supabase
      .from('demand_requests')
      .select('id, description, status, created_at')
      .eq('hub', hub)
      .order('created_at', { ascending: false })
    setMyRequests(data || [])
  }

  useEffect(() => {
    loadMyRequests()
  }, [hub])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.rpc('submit_demand_request', {
      p_hub: hub,
      p_description: description,
    })

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setDescription('')
    loadMyRequests()
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="rounded border border-ink/10 bg-white p-3">
      <p className="text-sm font-medium mb-1">Can't find what you're looking for?</p>
      <p className="text-xs text-ink/50 mb-3">
        Describe it — any seller in this hub who might carry it can see your request.
      </p>
      {note && <p className="text-xs text-market-red mb-3">{note}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you looking for?"
          className="flex-1 text-sm rounded border border-ink/20 px-3 py-2 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className={`shrink-0 text-sm text-white rounded px-3 py-2 disabled:opacity-60 ${accentClass}`}
        >
          {submitting ? '…' : 'Ask'}
        </button>
      </form>

      {error && <p className="text-xs text-market-red mb-2">{error}</p>}
      {success && <p className="text-xs text-market-green mb-2">Posted — visible to sellers now.</p>}

      {myRequests.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-ink/10">
          <p className="text-xs font-medium text-ink/50">Your requests here</p>
          {myRequests.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs">
              <span className="text-ink/70">{r.description}</span>
              <span className="text-ink/40 capitalize">{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
