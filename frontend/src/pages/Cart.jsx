import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Cart() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState({})
  const [checkingOut, setCheckingOut] = useState(null)
  const [orderPlaced, setOrderPlaced] = useState(null)

  async function loadCart() {
    setLoading(true)
    // Cart is per-seller in checkout, so we need the seller behind each
    // product to be able to group correctly.
    const { data, error } = await supabase
      .from('cart_items')
      .select(
        `id, quantity, product_variant_id,
         products ( id, name, price, seller_id, sellers ( store_name ) ),
         product_variants ( name, price )`
      )
      .order('added_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setItems(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCart()
  }, [])

  async function updateQuantity(cartItemId, newQty) {
    await supabase.rpc('update_cart_quantity', { p_cart_item_id: cartItemId, p_quantity: newQty })
    loadCart()
  }

  async function removeItem(cartItemId) {
    await supabase.rpc('remove_from_cart', { p_cart_item_id: cartItemId })
    loadCart()
  }

  async function handleCheckout(sellerId) {
    if (!termsAccepted[sellerId]) {
      setError('Please accept the delivery terms before checking out.')
      return
    }
    setCheckingOut(sellerId)
    setError(null)

    const { data: orderId, error } = await supabase.rpc('checkout_cart', {
      p_seller_id: sellerId,
      p_delivery_type: 'home_delivery',
      p_terms_accepted: true,
    })

    setCheckingOut(null)
    if (error) {
      setError(error.message)
      return
    }
    setOrderPlaced(orderId)
    loadCart()
  }

  if (loading) return <div className="p-4 text-ink/50">Loading…</div>

  if (items.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-display font-semibold text-indigo mb-2">Cart</h1>
        <p className="text-ink/50">Your cart is empty.</p>
      </div>
    )
  }

  // Group line items by the seller behind them — checkout_cart() processes
  // one seller at a time by design, matching how orders already work.
  const bySeller = items.reduce((acc, item) => {
    const sellerId = item.products.seller_id
    const storeName = item.products.sellers?.store_name || 'Store'
    if (!acc[sellerId]) acc[sellerId] = { storeName, items: [] }
    acc[sellerId].items.push(item)
    return acc
  }, {})

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-display font-semibold text-indigo mb-4">Cart</h1>

      {orderPlaced && (
        <p className="rounded bg-market-green/10 text-market-green text-sm px-3 py-2 mb-4">
          Order placed — reference {orderPlaced}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-market-red mb-4">
          {error}
        </p>
      )}

      {Object.entries(bySeller).map(([sellerId, group]) => {
        const subtotal = group.items.reduce((sum, item) => {
          const unitPrice = item.product_variants?.price ?? item.products.price
          return sum + unitPrice * item.quantity
        }, 0)

        return (
          <div key={sellerId} className="mb-6 rounded border border-ink/10 bg-white p-3">
            <p className="font-display font-medium text-sm text-indigo mb-3">{group.storeName}</p>

            {group.items.map((item) => {
              const unitPrice = item.product_variants?.price ?? item.products.price
              return (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-ink/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.products.name}</p>
                    {item.product_variants && (
                      <p className="text-xs text-ink/50">{item.product_variants.name}</p>
                    )}
                    <p className="font-mono text-xs text-ink/60">
                      ₦{Number(unitPrice).toLocaleString()} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="text-lg px-2"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="font-mono text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="text-lg px-2"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-market-red ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}

            <p className="font-mono text-right font-medium mt-3">
              Subtotal: ₦{subtotal.toLocaleString()}
            </p>

            <label className="flex items-start gap-2 mt-3 text-xs text-ink/70">
              <input
                type="checkbox"
                checked={!!termsAccepted[sellerId]}
                onChange={(e) =>
                  setTermsAccepted((prev) => ({ ...prev, [sellerId]: e.target.checked }))
                }
                className="accent-indigo mt-0.5"
              />
              I accept the delivery terms for this order.
            </label>

            <button
              onClick={() => handleCheckout(sellerId)}
              disabled={checkingOut === sellerId}
              className="w-full mt-3 rounded bg-indigo text-paper font-display font-medium py-2 hover:bg-indigo-light transition-colors disabled:opacity-60"
            >
              {checkingOut === sellerId ? 'Placing order…' : `Checkout — ${group.storeName}`}
            </button>
          </div>
        )
      })}
    </div>
  )
}
