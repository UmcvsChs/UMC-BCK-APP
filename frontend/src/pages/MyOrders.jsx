import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [disputing, setDisputing] = useState(null)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ratingFor, setRatingFor] = useState(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingComment, setRatingComment] = useState('')

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select('id, status, total_amount, delivery_type, created_at, sellers(store_name), disputes(id, status), delivery_ratings(id, rating)')
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function submitDispute(orderId) {
    setSubmitting(true)
    const { error } = await supabase.rpc('raise_dispute', {
      p_order_id: orderId,
      p_reason: reason,
      p_description: description,
    })
    setSubmitting(false)
    if (!error) {
      setDisputing(null)
      setReason('')
      setDescription('')
      load()
    }
  }

  async function submitRating(orderId) {
    if (!ratingValue) return
    setSubmitting(true)
    const { error } = await supabase.rpc('rate_delivery_agent', {
      p_order_id: orderId,
      p_rating: ratingValue,
      p_comment: ratingComment.trim() || null,
    })
    setSubmitting(false)
    if (!error) {
      setRatingFor(null)
      setRatingValue(0)
      setRatingComment('')
      load()
    } else {
      alert(error.message)
    }
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-4">My Orders</h1>

      {orders.length === 0 && <p className="text-ink/50">No orders yet.</p>}

      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="rounded border border-ink/10 bg-surface px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{o.sellers?.store_name}</p>
                <p className="font-mono text-xs text-ink/50">{o.id.slice(0, 8)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">₦{Number(o.total_amount).toLocaleString()}</p>
                <span className="text-xs font-medium text-indigo capitalize">{o.status}</span>
              </div>
            </div>

            <Link to={`/orders/${o.id}`} className="text-xs text-indigo underline">
              View receipt
            </Link>

            {o.status === 'delivered' && (!o.delivery_ratings || o.delivery_ratings.length === 0) && (
              <div className="mt-2">
                {ratingFor === o.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setRatingValue(n)}
                          className={`text-2xl ${n <= ratingValue ? 'text-gold' : 'text-ink/20'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <input
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Comment (optional)"
                      className="w-full text-xs rounded border border-ink/20 px-2 py-1"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitRating(o.id)}
                        disabled={submitting || !ratingValue}
                        className="flex-1 text-xs bg-gold text-ink rounded py-1.5 disabled:opacity-60"
                      >
                        Submit rating
                      </button>
                      <button onClick={() => setRatingFor(null)} className="text-xs text-ink/50 px-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setRatingFor(o.id)} className="text-xs text-gold-dark underline">
                    ⭐ Rate your delivery
                  </button>
                )}
              </div>
            )}

            {o.disputes?.length > 0 ? (
              <p className="text-xs text-gold-dark mt-1 capitalize">Dispute: {o.disputes[0].status.replace(/_/g, ' ')}</p>
            ) : (
              o.status !== 'new' &&
              (disputing === o.id ? (
                <div className="mt-2 space-y-2">
                  <input
                    placeholder="Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full text-xs rounded border border-ink/20 px-2 py-1"
                  />
                  <textarea
                    placeholder="Describe the issue"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full text-xs rounded border border-ink/20 px-2 py-1"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitDispute(o.id)}
                      disabled={submitting}
                      className="flex-1 text-xs bg-market-red text-white rounded py-1.5 disabled:opacity-60"
                    >
                      Submit dispute
                    </button>
                    <button onClick={() => setDisputing(null)} className="text-xs text-ink/50 px-2">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setDisputing(o.id)} className="text-xs text-market-red underline mt-1">
                  Raise a dispute
                </button>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
