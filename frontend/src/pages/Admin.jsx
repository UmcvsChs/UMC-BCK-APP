import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const [tab, setTab] = useState('registrations')

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">Admin Control Room</h1>
      <p className="text-sm text-ink/50 mb-6">
        Nothing goes live without passing through here — every registration and listing waits for review.
      </p>

      <div className="flex gap-1 border-b border-ink/10 mb-4">
        {['registrations', 'listings', 'prescriptions'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize ${
              tab === t ? 'text-indigo border-b-2 border-indigo' : 'text-ink/50'
            }`}
          >
            {t === 'prescriptions' ? 'Prescription requests' : `Pending ${t}`}
          </button>
        ))}
      </div>

      {tab === 'registrations' && <PendingRegistrations />}
      {tab === 'listings' && <PendingListings />}
      {tab === 'prescriptions' && <PendingPrescriptions />}
    </div>
  )
}

function PendingPrescriptions() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)
  const [signedUrls, setSignedUrls] = useState({})

  async function load() {
    const { data, error } = await supabase
      .from('prescription_requests')
      .select('id, medication_name, dosage, requested_quantity, notes, prescription_image_url, status')
      .eq('status', 'pending')
    if (!error) setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function viewPrescription(row) {
    // Private bucket — a signed URL is required, there is no public link.
    const { data } = await supabase.storage
      .from('prescriptions')
      .createSignedUrl(row.prescription_image_url, 300)
    if (data) setSignedUrls((prev) => ({ ...prev, [row.id]: data.signedUrl }))
  }

  async function handleDecision(requestId, approve) {
    setActioning(requestId)
    await supabase.rpc('review_prescription_request', {
      p_request_id: requestId,
      p_decision: approve ? 'approved' : 'declined',
    })
    setActioning(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (rows.length === 0) return <p className="text-ink/50">No pending prescription requests.</p>

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <p className="text-sm font-medium">{r.medication_name}</p>
          <p className="text-xs text-ink/50">
            Qty {r.requested_quantity}
            {r.dosage && ` · ${r.dosage}`}
          </p>
          {r.notes && <p className="text-xs text-ink/60 mt-1">{r.notes}</p>}

          {signedUrls[r.id] ? (
            <a
              href={signedUrls[r.id]}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo underline mt-1 inline-block"
            >
              View prescription photo
            </a>
          ) : (
            <button onClick={() => viewPrescription(r)} className="text-xs text-indigo underline mt-1">
              Load prescription photo
            </button>
          )}

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => handleDecision(r.id, true)}
              disabled={actioning === r.id}
              className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() => handleDecision(r.id, false)}
              disabled={actioning === r.id}
              className="text-xs bg-market-red text-white rounded px-3 py-1.5 disabled:opacity-60"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PendingRegistrations() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)

  async function load() {
    // admin_pending_registrations unifies sellers/delivery_agents/repairers/
    // pharma_reseller_verifications into one queue — built for exactly this.
    const { data, error } = await supabase.from('admin_pending_registrations').select('*')
    if (!error) setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDecision(row, approve) {
    setActioning(row.id)
    const fn = approve ? 'admin_approve_registration' : 'admin_reject_registration'
    await supabase.rpc(fn, { p_registration_type: row.registration_type, p_id: row.id })
    setActioning(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (rows.length === 0) return <p className="text-ink/50">No pending registrations.</p>

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={`${r.registration_type}-${r.id}`} className="rounded border border-ink/10 bg-white px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{r.display_name || r.registration_type}</p>
              <p className="text-xs text-ink/50 capitalize">{r.registration_type.replace('_', ' ')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDecision(r, true)}
                disabled={actioning === r.id}
                className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(r, false)}
                disabled={actioning === r.id}
                className="text-xs bg-market-red text-white rounded px-3 py-1.5 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PendingListings() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)

  async function load() {
    const { data, error } = await supabase.from('admin_pending_listings').select('*')
    if (!error) setRows(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDecision(productId, approve) {
    setActioning(productId)
    const fn = approve ? 'admin_approve_listing' : 'admin_reject_listing'
    await supabase.rpc(fn, { p_product_id: productId })
    setActioning(null)
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (rows.length === 0) return <p className="text-ink/50">No pending listings.</p>

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="rounded border border-ink/10 bg-white px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-ink/50">
                {r.store_name} · {r.category}
                {r.price != null && ` · ₦${Number(r.price).toLocaleString()}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDecision(r.id, true)}
                disabled={actioning === r.id}
                className="text-xs bg-market-green text-white rounded px-3 py-1.5 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(r.id, false)}
                disabled={actioning === r.id}
                className="text-xs bg-market-red text-white rounded px-3 py-1.5 disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
