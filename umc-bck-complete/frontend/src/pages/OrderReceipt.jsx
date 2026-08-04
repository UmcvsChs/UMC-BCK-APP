import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function OrderReceipt() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: i }, { data: p }] = await Promise.all([
        supabase.from('orders').select('*, sellers(store_name)').eq('id', orderId).single(),
        supabase.from('order_items').select('*, products(name)').eq('order_id', orderId),
        supabase.from('order_payments').select('*').eq('order_id', orderId),
      ])
      setOrder(o)
      setItems(i || [])
      setPayments(p || [])
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

      <div className="rounded border border-ink/10 bg-white p-4">
        <p className="text-xs text-ink/50 font-mono mb-1">Reference</p>
        <p className="font-mono text-sm mb-4">{order.id}</p>

        <p className="text-sm font-medium mb-1">{order.sellers?.store_name}</p>
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
