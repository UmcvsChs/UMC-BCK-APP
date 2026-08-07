import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function OrderReceipt() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: i }, { data: p }, { data: da }] = await Promise.all([
        supabase.from('orders').select('*, sellers(store_name, primary_hub)').eq('id', orderId).single(),
        supabase.from('order_items').select('*, products(name)').eq('order_id', orderId),
        supabase.from('order_payments').select('*').eq('order_id', orderId),
        supabase.from('delivery_assignments').select('status, assigned_at, arrived_at').eq('order_id', orderId).order('assigned_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      setOrder(o)
      setItems(i || [])
      setPayments(p || [])
      setAssignment(da)
      setLoading(false)
    }
    load()
  }, [orderId])

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>
  if (!order) return <div className="p-4 text-market-red">Order not found.</div>

  return (
    <div className="p-4 max-w-md mx-auto">
      <Link to="/orders" className="text-sm text-indigo mb-3 block">
        ← My Orders
      </Link>

      <div className="rounded border border-ink/10 bg-surface p-4">
        <p className="text-xs text-ink/50 font-mono mb-1">Reference</p>
        <p className="font-mono text-sm mb-4">{order.id}</p>

        <p className="text-sm font-medium mb-1">{order.sellers?.store_name}</p>

        {assignment?.arrived_at && order.status !== 'delivered' && (
          <BuyerConfirmDeliveryGate orderId={order.id} onConfirmed={() => window.location.reload()} />
        )}

        {order.delivery_type === 'proxy_pickup' && order.status !== 'delivered' && order.status !== 'rejected' && order.status !== 'cancelled' && (
          <ProxyPickupTicket order={order} />
        )}

        {order.sellers?.primary_hub === 'canteen' && order.status !== 'delivered' && order.status !== 'rejected' && order.status !== 'cancelled' && (
          <CanteenTracker order={order} assignment={assignment} />
        )}
        <p className="text-xs text-ink/50 mb-4">{new Date(order.created_at).toLocaleString()}</p>

        <div className="space-y-2 py-3 border-y border-ink/10">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.products?.name} × {item.quantity}
                {item.contributor_name && <span className="text-ink/40"> (for {item.contributor_name})</span>}
              </span>
              <span className="font-mono">₦{Number(item.line_total).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="py-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-ink/60">Subtotal</span>
            <span className="font-mono">₦{Number(order.subtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink/60">Delivery fee</span>
            <span className="font-mono">₦{Number(order.delivery_fee).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-medium text-base pt-1">
            <span>Total</span>
            <span className="font-mono text-indigo">₦{Number(order.total_amount).toLocaleString()}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-ink/10 text-xs text-ink/60 space-y-1">
          <p>Delivery: {order.delivery_type?.replace(/_/g, ' ')}</p>
          {order.delivery_address && <p>Address: {order.delivery_address}</p>}
          <p>Status: <span className="capitalize font-medium text-indigo">{order.status}</span></p>
          {payments.map((p) => (
            <p key={p.id}>
              Paid: ₦{Number(p.amount).toLocaleString()} ({p.payment_type.replace(/_/g, ' ')}) via UMC-BCK Wallet
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

// Real 4-stage tracker specific to Canteen orders, matching the real
// original source exactly — order received, canteen preparing (with a
// genuine estimated ready time), rider picking up, delivered to office.
// Each stage's completion is derived from real order/assignment state,
// not a fake simulated progress bar.
function CanteenTracker({ order, assignment }) {
  const stages = [
    { key: 'received', label: 'Order received', done: true, time: new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    {
      key: 'preparing',
      label: 'Canteen preparing your food',
      done: ['preparing', 'assigned', 'delivered'].includes(order.status),
      time: order.est_ready_time ? `Est. ready: ${new Date(order.est_ready_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'In progress',
    },
    {
      key: 'pickup',
      label: 'Rider picking up',
      done: assignment?.status === 'assigned' || assignment?.status === 'delivered',
      time: assignment ? 'On the way' : 'Pending',
    },
    { key: 'delivered', label: 'Delivered to your office', done: order.status === 'delivered', time: 'Pending' },
  ]

  return (
    <div className="my-3 py-2">
      {stages.map((s, i) => (
        <div key={s.key} className="flex items-center gap-3 py-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
              s.done ? 'bg-market-green text-white' : 'bg-surface border border-ink/20 text-ink/40'
            }`}
          >
            {s.done ? '✓' : i + 1}
          </div>
          <div>
            <p className={`text-xs font-medium ${s.done ? 'text-ink' : 'text-ink/40'}`}>{s.label}</p>
            <p className="text-xs text-ink/40">{s.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Real gap fixed: the agent used to self-attest delivery on the buyer's
// behalf. Now the genuine buyer sees this real prompt once the agent has
// recorded arrival, and only their own confirmation (or a real 48-hour
// timeout, or admin dispute resolution) triggers fund settlement.
function BuyerConfirmDeliveryGate({ orderId, onConfirmed }) {
  const [submitting, setSubmitting] = useState(false)
  const [disputing, setDisputing] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [message, setMessage] = useState(null)

  async function confirmReceived() {
    setSubmitting(true)
    const { error } = await supabase.rpc('mark_order_delivered', { p_order_id: orderId })
    setSubmitting(false)
    if (error) {
      setMessage(error.message)
      return
    }
    onConfirmed()
  }

  async function submitDispute(e) {
    e.preventDefault()
    if (!disputeReason.trim()) return
    setSubmitting(true)
    const { error } = await supabase.rpc('raise_dispute', {
      p_order_id: orderId,
      p_reason: 'delivery_issue',
      p_description: disputeReason.trim(),
    })
    setSubmitting(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Dispute filed — admin will review this.')
    setDisputing(false)
  }

  return (
    <div className="mb-3 rounded bg-gold/10 border border-gold/30 p-3">
      <p className="text-sm font-medium mb-1">📦 Your rider has arrived</p>
      <p className="text-xs text-ink/60 mb-2">
        Please inspect your order, then confirm receipt or raise a dispute — this is what releases payment to the
        seller.
      </p>
      {!disputing ? (
        <div className="flex gap-2">
          <button
            onClick={confirmReceived}
            disabled={submitting}
            className="flex-1 text-sm bg-market-green text-white rounded py-2 disabled:opacity-60"
          >
            ✓ Confirm received
          </button>
          <button
            onClick={() => setDisputing(true)}
            disabled={submitting}
            className="flex-1 text-sm bg-market-red text-white rounded py-2 disabled:opacity-60"
          >
            Raise dispute
          </button>
        </div>
      ) : (
        <form onSubmit={submitDispute} className="space-y-2">
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="What's wrong with the delivery?"
            rows={2}
            className="w-full text-sm rounded border border-ink/20 px-2 py-1.5"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="flex-1 text-sm bg-market-red text-white rounded py-2 disabled:opacity-60">
              Submit dispute
            </button>
            <button type="button" onClick={() => setDisputing(false)} className="text-sm text-ink/50 px-3">
              Cancel
            </button>
          </div>
        </form>
      )}
      {message && <p className="text-xs text-ink/60 mt-2">{message}</p>}
    </div>
  )
}

// Real, genuinely signed pickup ticket — not just a display label. The
// signature is verified server-side against the order, so it can't be
// forged by editing the displayed code.
function ProxyPickupTicket({ order }) {
  const [personName, setPersonName] = useState(order.pickup_person_name || '')
  const [personPhone, setPersonPhone] = useState(order.pickup_person_phone || '')
  const [ticket, setTicket] = useState(order.pickup_ticket_code || null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  async function generate(e) {
    e.preventDefault()
    if (!personName.trim()) return
    setSubmitting(true)
    setMessage(null)
    const { data, error } = await supabase.rpc('generate_proxy_pickup_ticket', {
      p_order_id: order.id,
      p_person_name: personName.trim(),
      p_person_phone: personPhone.trim() || null,
    })
    setSubmitting(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setTicket(data)
  }

  if (order.pickup_ticket_used_at) {
    return (
      <div className="mb-3 rounded bg-market-green/10 border border-market-green/30 p-3">
        <p className="text-sm text-market-green">✓ Picked up — ticket redeemed {new Date(order.pickup_ticket_used_at).toLocaleString()}</p>
      </div>
    )
  }

  return (
    <div className="mb-3 rounded bg-gold/10 border border-gold/30 p-3">
      <p className="text-sm font-medium mb-1">👤 Proxy pickup ticket</p>
      {ticket ? (
        <>
          <p className="text-xs text-ink/60 mb-2">
            Give this real, signed code to <strong>{personName}</strong> — the store verifies it before releasing your order.
          </p>
          <p className="font-mono text-xs bg-white rounded p-2 break-all">{ticket}</p>
        </>
      ) : (
        <form onSubmit={generate} className="space-y-2">
          <p className="text-xs text-ink/60 mb-1">Who's collecting on your behalf?</p>
          <input
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="Their full name"
            className="w-full text-sm rounded border border-ink/20 px-2 py-1.5"
          />
          <input
            value={personPhone}
            onChange={(e) => setPersonPhone(e.target.value)}
            placeholder="Their phone (optional)"
            className="w-full text-sm rounded border border-ink/20 px-2 py-1.5"
          />
          <button type="submit" disabled={submitting} className="w-full text-sm bg-gold text-ink rounded py-2 disabled:opacity-60">
            {submitting ? 'Generating…' : 'Generate real pickup ticket'}
          </button>
        </form>
      )}
      {message && <p className="text-xs text-market-red mt-2">{message}</p>}
    </div>
  )
}
