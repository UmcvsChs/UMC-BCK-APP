import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Real, read-only store stock view — exactly matching the reference:
// an attendant can see what's actually in stock and its real price, but
// genuinely cannot edit prices or upload — that stays the director's.
export default function MyStoreStock({ sellerId }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('products')
        .select('id, name, unit, price, stock_quantity')
        .eq('seller_id', sellerId)
        .eq('status', 'live')
        .order('name')
      setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [sellerId])

  if (loading) return <p className="text-ink/50 text-sm">Loading…</p>

  return (
    <div>
      <div className="rounded bg-gold/10 border border-gold/30 px-3 py-2 text-xs text-gold-dark mb-3">
        Attendant mode — you can view stock, record sales, and submit requests. Prices and uploads are controlled
        by the store director only.
      </div>
      <p className="text-sm font-medium mb-2">My store stock</p>
      {products.length === 0 ? (
        <p className="text-xs text-ink/40">Nothing listed yet for this store.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded border border-ink/10 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-ink/50">
                  Per {p.unit || 'unit'} · ₦{Number(p.price).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-market-green">{p.stock_quantity} left</p>
                <p className="text-xs text-ink/40">{p.stock_quantity > 0 ? 'In stock' : 'Out of stock'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
