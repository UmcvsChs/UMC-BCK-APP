import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Cart() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState({})
  const [checkingOut, setCheckingOut] = useState(null)
  const [orderPlaced, setOrderPlaced] = useState(null)
  const [lgas, setLgas] = useState([])
  const [fees, setFees] = useState({})
  const [lgaId, setLgaId] = useState({})
  const [deliveryType, setDeliveryType] = useState({})
  const [deliveryAddress, setDeliveryAddress] = useState({})
  const [isInstalment, setIsInstalment] = useState({})
  const [depositAmount, setDepositAmount] = useState({})

  async function loadLgasAndFees() {
    const [{ data: l }, { data: f }] = await Promise.all([
      supabase.from('local_government_areas').select('id, name, states!inner(is_launched)').eq('states.is_launched', true).order('name'),
      supabase.from('delivery_fee_zones').select('lga_id, base_fee'),
    ])
    setLgas(l || [])
    const feeMap = {}
    ;(f || []).forEach((row) => {
      feeMap[row.lga_id] = row.base_fee
    })
    setFees(feeMap)
  }

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
    loadLgasAndFees()
  }, [])

  async function updateQuantity(cartItemId, newQty) {
    await supabase.rpc('update_cart_quantity', { p_cart_item_id: cartItemId, p_quantity: newQty })
    loadCart()
  }

  async function removeItem(cartItemId) {
    await supabase.rpc('remove_from_cart', { p_cart_item_id: cartItemId })
    loadCart()
  }

  async function handleCheckout(sellerId, subtotal) {
    if (!termsAccepted[sellerId]) {
      setError('Please accept the delivery terms before checking out.')
      return
    }
    const selectedLga = lgaId[sellerId]
    const fee = selectedLga ? fees[selectedLga] : undefined
    if (deliveryType[sellerId] !== 'store_pickup' && (!selectedLga || fee == null)) {
      setError('Please select an LGA with a set delivery fee — admin hasn\u2019t set a fee for this area yet.')
      return
    }

    setCheckingOut(sellerId)
    setError(null)

    const params = {
      p_seller_id: sellerId,
      p_delivery_address: deliveryAddress[sellerId] || null,
      p_delivery_lga_id: selectedLga || null,
      p_delivery_fee: deliveryType[sellerId] === 'store_pickup' ? 0 : Number(fee),
      p_delivery_type: deliveryType[sellerId] || 'home_delivery',
      p_terms_accepted: true,
    }

    if (isInstalment[sellerId]) {
      const deposit = Number(depositAmount[sellerId])
      if (!deposit || deposit <= 0) {
        setError('Enter a valid deposit amount for instalment checkout.')
        setCheckingOut(null)
        return
      }
      params.p_is_instalment = true
      params.p_deposit_amount = deposit
    }

    const { data: orderId, error } = await supabase.rpc('checkout_cart', params)

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

            <div className="mt-3 space-y-2">
              <select
                value={deliveryType[sellerId] || 'home_delivery'}
                onChange={(e) => setDeliveryType((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                className="w-full text-sm rounded border border-ink/20 px-3 py-2"
              >
                <option value="home_delivery">Home delivery</option>
                <option value="store_pickup">Store pickup</option>
                <option value="proxy_pickup">Proxy pickup</option>
              </select>

              {deliveryType[sellerId] !== 'store_pickup' && (
                <>
                  <select
                    value={lgaId[sellerId] || ''}
                    onChange={(e) => setLgaId((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                    className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                  >
                    <option value="">Select delivery LGA</option>
                    {lgas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {fees[l.id] != null ? `— ₦${Number(fees[l.id]).toLocaleString()}` : '— fee not set'}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Delivery address"
                    value={deliveryAddress[sellerId] || ''}
                    onChange={(e) => setDeliveryAddress((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                    className="w-full text-sm rounded border border-ink/20 px-3 py-2"
                  />
                </>
              )}

              <label className="flex items-center gap-2 text-xs text-ink/70">
                <input
                  type="checkbox"
                  checked={!!isInstalment[sellerId]}
                  onChange={(e) => setIsInstalment((prev) => ({ ...prev, [sellerId]: e.target.checked }))}
                  className="accent-gold"
                />
                Pay in instalments (deposit now, balance later)
              </label>
              {isInstalment[sellerId] && (
                <input
                  type="number"
                  placeholder={`Deposit (must be less than ₦${subtotal.toLocaleString()})`}
                  value={depositAmount[sellerId] || ''}
                  onChange={(e) => setDepositAmount((prev) => ({ ...prev, [sellerId]: e.target.value }))}
                  className="w-full text-sm rounded border border-ink/20 px-3 py-2 font-mono"
                />
              )}
            </div>

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
              onClick={() => handleCheckout(sellerId, subtotal)}
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
