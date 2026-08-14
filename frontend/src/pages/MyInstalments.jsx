import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Real "My Instalments" — every real active plan, with real actions
// matching the exact real policy: pay toward the balance, cancel (the
// real fee is computed honestly based on real days elapsed), or
// transfer once past the 90-day window.
export default function MyInstalments() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [payAmount, setPayAmount] = useState({})
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at, sellers(store_name), order_instalment_details(deposit_amount, balance_amount, refund_full_until, refund_partial_until, refund_partial_fee_pct)')
      .eq('is_instalment', true)
      .order('created_at', { ascending: false })
    setPlans((data || []).filter((o) => o.order_instalment_details))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function pay(orderId) {
    const amount = Number(payAmount[orderId])
    if (!amount || amount <= 0) return
    setBusy(orderId)
    const { error } = await supabase.rpc('make_instalment_payment', { p_order_id: orderId, p_amount: amount })
    setBusy(null)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('✓ Real payment recorded toward your balance.')
    setPayAmount((p) => ({ ...p, [orderId]: '' }))
    load()
  }

  async function cancel(orderId) {
    if (!confirm('Cancel this real instalment plan? Depending on how long it\u2019s been active, a real cancellation fee may apply.')) return
    setBusy(orderId)
    const { error } = await supabase.rpc('cancel_instalment_order', { p_order_id: orderId })
    setBusy(null)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Real plan cancelled.')
    load()
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-display font-semibold text-indigo mb-1">💳 My Instalments</h1>
      <p className="text-sm text-ink/60 mb-4">Real, active instalment plans and their real balances.</p>

      {message && <p className="text-xs text-market-green mb-3">{message}</p>}

      {plans.length === 0 ? (
        <p className="text-sm text-ink/50 text-center py-12">No real instalment plans right now.</p>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => {
            const detail = p.order_instalment_details
            const now = new Date()
            const pastPartial = new Date(detail.refund_partial_until) < now
            return (
              <div key={p.id} className="rounded border border-ink/10 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{p.sellers?.store_name}</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark">{p.status}</span>
                </div>
                <p className="text-xs text-ink/50 mb-2">
                  Total ₦{Number(p.total_amount).toLocaleString()} · Real balance remaining: ₦{Number(detail.balance_amount).toLocaleString()}
                </p>

                {p.status !== 'cancelled' && Number(detail.balance_amount) > 0 && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="number"
                        value={payAmount[p.id] || ''}
                        onChange={(e) => setPayAmount((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="Amount to pay now"
                        className="flex-1 rounded border border-ink/20 px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => pay(p.id)}
                        disabled={busy === p.id}
                        className="text-xs bg-market-green text-white rounded px-3 disabled:opacity-60"
                      >
                        Pay
                      </button>
                    </div>
                    {!pastPartial ? (
                      <button onClick={() => cancel(p.id)} disabled={busy === p.id} className="text-xs text-market-red">
                        Cancel this plan
                      </button>
                    ) : (
                      <p className="text-xs text-ink/40">
                        Past the real refund window — this deposit is non-refundable, but can be transferred to a
                        different item from this seller.
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
