import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AddStockAcrossStores({ stores }) {
  const ownedStores = stores.filter((s) => s.myRole === 'owner')
  const [myProducts, setMyProducts] = useState([])
  const [sourceProductId, setSourceProductId] = useState('')
  const [targetSellerId, setTargetSellerId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [movements, setMovements] = useState([])

  async function loadProducts() {
    const ids = ownedStores.map((s) => s.id)
    const { data } = await supabase.from('products').select('id, name, seller_id').in('seller_id', ids).order('name')
    setMyProducts(data || [])
  }

  async function loadMovements() {
    const { data } = await supabase
      .from('stock_movements')
      .select('item_name, quantity_added, created_at, sellers!stock_movements_target_seller_id_fkey(store_name)')
      .order('created_at', { ascending: false })
      .limit(10)
    setMovements(data || [])
  }

  useEffect(() => {
    loadProducts()
    loadMovements()
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!sourceProductId || !targetSellerId || !quantity) return
    setSubmitting(true)
    setMessage(null)
    const { error } = await supabase.rpc('add_stock_to_store', {
      p_source_product_id: sourceProductId,
      p_target_seller_id: targetSellerId,
      p_quantity: Number(quantity),
    })
    setSubmitting(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage('Stock added — no re-upload needed.')
    setSourceProductId('')
    setTargetSellerId('')
    setQuantity('')
    loadMovements()
  }

  return (
    <div>
      <div className="rounded border border-ink/10 bg-surface p-3 mb-4">
        <p className="text-sm font-medium mb-1">📦 Add stock to a store</p>
        <p className="text-xs text-ink/50 mb-3">
          Select an existing product from your catalogue and add units to a specific store. No re-uploading needed.
        </p>
        <form onSubmit={submit} className="space-y-2">
          <select
            value={sourceProductId}
            onChange={(e) => setSourceProductId(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2"
          >
            <option value="">-- Select product --</option>
            {myProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={targetSellerId}
            onChange={(e) => setTargetSellerId(e.target.value)}
            className="w-full text-sm rounded border border-ink/20 px-3 py-2"
          >
            <option value="">-- Add to which store --</option>
            {ownedStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.store_name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity to add — e.g. 50 bags"
            className="w-full text-sm rounded border border-ink/20 px-3 py-2"
          />
          <button type="submit" disabled={submitting} className="w-full text-sm bg-market-green text-white rounded py-2.5 disabled:opacity-60">
            {submitting ? 'Adding…' : 'Add stock to store'}
          </button>
        </form>
        {message && <p className="text-xs text-ink/60 mt-2">{message}</p>}
      </div>

      <div className="rounded border border-ink/10 bg-surface p-3">
        <p className="text-sm font-medium mb-2">Recent stock movements</p>
        {movements.length === 0 && <p className="text-xs text-ink/50">No stock movements yet</p>}
        {movements.map((m, i) => (
          <div key={i} className="text-xs text-ink/60 flex justify-between py-1.5 border-b border-ink/5">
            <span>{m.item_name} → {m.sellers?.store_name}</span>
            <span className="font-mono">+{m.quantity_added}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

