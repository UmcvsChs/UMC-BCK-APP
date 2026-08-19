import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function CreditSaleRequests({ sellerId }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('credit_sale_requests')
      .select('id, item_name, quantity, unit_price, debtor_name, debtor_phone, created_at, profiles!credit_sale_requests_requested_by_fkey(full_name)')
      .eq('seller_id', sellerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function resolve(requestId, approve) {
    setActing(requestId)
    const { error } = await supabase.rpc('resolve_credit_sale_request', { p_request_id: requestId, p_approve: approve })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (requests.length === 0) return <p className="text-ink/50 text-sm">No pending credit sale requests right now.</p>

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/50 mb-2">
        Real requests from your attendants — approving genuinely records the sale, decrements real stock, and
        creates a real receivable, exactly as if you'd recorded it yourself.
      </p>
      {requests.map((r) => (
        <div key={r.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <p className="text-sm font-medium">
            {r.item_name} × {r.quantity} — <span className="font-mono text-indigo">₦{Number(r.quantity * r.unit_price).toLocaleString()}</span>
          </p>
          <p className="text-xs text-ink/50">
            Owed by {r.debtor_name}{r.debtor_phone && ` (${r.debtor_phone})`} — requested by {r.profiles?.full_name || 'an attendant'}
          </p>
          <div className="flex gap-1 mt-2">
            <button onClick={() => resolve(r.id, true)} disabled={acting === r.id} className="text-xs bg-market-green text-white rounded px-3 py-1">
              Approve
            </button>
            <button onClick={() => resolve(r.id, false)} disabled={acting === r.id} className="text-xs bg-market-red text-white rounded px-3 py-1">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

