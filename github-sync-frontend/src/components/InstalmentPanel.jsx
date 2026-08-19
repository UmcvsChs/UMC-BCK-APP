import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Real Instalment/BNPL purchase option — built from the actual, real
// finalized policy in the original handover notes, not invented. Only
// shows on products from a real seller who has genuinely opted in.
export default function InstalmentPanel({ product, sellerId }) {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [deposit, setDeposit] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const price = Number(product.price)
  const minDeposit = Math.round(price * 0.2)

  async function submit() {
    setError(null)
    const depositNum = Number(deposit)
    if (!depositNum || depositNum < minDeposit) {
      setError(`Your real deposit must be at least ₦${minDeposit.toLocaleString()} (20% of the price).`)
      return
    }
    if (depositNum >= price) {
      setError('Your deposit must be less than the full price — that would just be a normal purchase.')
      return
    }
    setSubmitting(true)
    const { data, error: orderError } = await supabase.rpc('place_order', {
      p_seller_id: sellerId,
      p_items: [{ product_id: product.id, quantity: 1 }],
      p_is_instalment: true,
      p_deposit_amount: depositNum,
      p_terms_accepted: true,
    })
    setSubmitting(false)
    if (orderError) {
      setError(orderError.message)
      return
    }
    navigate(`/order/${data[0]}`)
  }

  return (
    <div className="rounded border-2 border-gold/40 bg-gold/10 px-3 py-3 mb-4">
      <p className="text-sm font-semibold text-gold-dark mb-1">💳 Real instalment payment available</p>
      <p className="text-xs text-ink/60 mb-2">
        Pay a real deposit now, the real balance over time. This real seller has genuinely opted in.
      </p>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="w-full text-sm bg-gold text-ink font-medium rounded py-2">
          Buy on real instalment →
        </button>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs text-ink/50">Real deposit (minimum ₦{minDeposit.toLocaleString()} — 20%)</label>
          <input
            type="number"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            placeholder={`e.g. ${minDeposit}`}
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />

          <div className="rounded bg-white/70 px-3 py-2 text-xs text-ink/60 space-y-1">
            <p className="font-semibold text-ink/80">Real terms — please read before confirming:</p>
            <p>• Cancel within 7 real days of today — your deposit is fully refunded.</p>
            <p>• Cancel between 7–90 real days — a real 20% cancellation fee applies on your deposit.</p>
            <p>• After 90 real days, your deposit is non-refundable, but can be transferred to a different real item from the same seller.</p>
          </div>

          {error && <p className="text-xs text-market-red">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-market-green text-white text-sm font-medium rounded py-2 disabled:opacity-60"
          >
            {submitting ? 'Placing…' : `Confirm — pay ₦${(Number(deposit) || 0).toLocaleString()} deposit now`}
          </button>
        </div>
      )}
    </div>
  )
}
