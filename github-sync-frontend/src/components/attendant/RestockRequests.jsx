import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Real, genuinely shared component — same reasoning as SalesRegister.
export default function RestockRequests({ sellerId }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [newStock, setNewStock] = useState({})
  const [acting, setActing] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('restock_requests')
      .select('id, current_stock_at_request, suggested_quantity, notes, status, created_at, products(name), profiles!restock_requests_requested_by_fkey(full_name)')
      .eq('seller_id', sellerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [sellerId])

  async function resolve(requestId, status) {
    setActing(requestId)
    const { error } = await supabase.rpc('resolve_restock_request', {
      p_request_id: requestId,
      p_status: status,
      p_new_stock_quantity: status === 'restocked' ? Number(newStock[requestId]) : null,
    })
    setActing(null)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  if (loading) return <p className="text-ink/50">Loading…</p>
  if (requests.length === 0) return <p className="text-ink/50 text-sm">No pending restock flags right now.</p>

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink/50 mb-2">
        Real flags raised by you or your attendants — resolving as "Restocked" genuinely updates the real stock
        quantity, the same one the online storefront reads from.
      </p>
      {requests.map((r) => (
        <div key={r.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
          <p className="text-sm font-medium">{r.products?.name}</p>
          <p className="text-xs text-ink/50">
            Was {r.current_stock_at_request} in stock when flagged by {r.profiles?.full_name || 'an attendant'}
            {r.suggested_quantity && <span className="text-gold-dark font-medium"> — suggests restocking {r.suggested_quantity}</span>}
            {r.notes && ` — "${r.notes}"`}
          </p>
          <div className="flex gap-1 mt-2">
            <input
              type="number"
              placeholder="New stock qty"
              value={newStock[r.id] || ''}
              onChange={(e) => setNewStock((prev) => ({ ...prev, [r.id]: e.target.value }))}
              className="flex-1 text-xs rounded border border-ink/20 px-2 py-1"
            />
            <button onClick={() => resolve(r.id, 'restocked')} disabled={acting === r.id} className="text-xs bg-market-green text-white rounded px-2 py-1">
              Restocked
            </button>
            <button onClick={() => resolve(r.id, 'acknowledged')} disabled={acting === r.id} className="text-xs bg-gold text-ink rounded px-2 py-1">
              Acknowledge
            </button>
            <button onClick={() => resolve(r.id, 'dismissed')} disabled={acting === r.id} className="text-xs text-market-red">
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

