import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// Real restock request form — matching the reference exactly, genuinely
// separate from the director-side resolution view.
export default function SubmitRestockRequest({ sellerId }) {
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState('')
  const [currentStock, setCurrentStock] = useState('')
  const [suggestedQuantity, setSuggestedQuantity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .eq('seller_id', sellerId)
        .eq('status', 'live')
        .order('name')
      setProducts(data || [])
      if (data?.[0]) setProductId(data[0].id)
    }
    load()
  }, [sellerId])

  const selectedProduct = products.find((p) => p.id === productId)

  async function submit() {
    if (!productId) return
    setSubmitting(true)
    const { error } = await supabase.rpc('submit_restock_request', {
      p_seller_id: sellerId,
      p_product_id: productId,
      p_notes: currentStock.trim() || null,
      p_suggested_quantity: suggestedQuantity ? Number(suggestedQuantity) : null,
    })
    setSubmitting(false)
    if (error) {
      setMessage(`Could not send: ${error.message}`)
      return
    }
    setMessage('✓ Real restock request sent to your director.')
    setCurrentStock('')
    setSuggestedQuantity('')
  }

  return (
    <div className="rounded border border-ink/10 p-3">
      <p className="text-sm font-medium mb-3">Request — restock</p>
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-ink/50 mb-1">Item running low</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full rounded border border-ink/20 px-3 py-2 text-sm">
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.stock_quantity} remaining)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1">Current stock remaining</label>
          <input
            value={currentStock}
            onChange={(e) => setCurrentStock(e.target.value)}
            placeholder="e.g. 3 bags left"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-ink/50 mb-1">Suggested restock quantity</label>
          <input
            value={suggestedQuantity}
            onChange={(e) => setSuggestedQuantity(e.target.value)}
            placeholder="e.g. 20 bags"
            className="w-full rounded border border-ink/20 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={submit}
          disabled={submitting || !selectedProduct}
          className="w-full bg-market-green text-white font-medium text-sm rounded py-2 disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send restock request to director'}
        </button>
        {message && <p className="text-xs text-ink/60">{message}</p>}
      </div>
    </div>
  )
}
